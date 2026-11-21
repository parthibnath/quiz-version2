"use client";

import React, { useState, useRef } from "react";
import { UPLOAD_EXTENSIONS, UPLOAD_FORMATS, MAX_UPLOAD_BYTES, MAX_TEXT_LENGTH } from "@/lib/uploads";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { SectionTag } from "@/components/SectionTag";
import { CameraCapture } from "@/components/CameraCapture";
import styles from "./upload.module.css";

interface ExtractionResult {
  uploadId: string;
  fileName: string;
  fileType: string;
  extractedText: string;
  charCount: number;
  uncertain?: boolean;
}

interface GenerationResult {
  count: number;
  uploadId: string;
  note?: string;
}

export default function UploadForm({ initialSource }: { initialSource?: ExtractionResult }) {
  const [activeTab, setActiveTab] = useState<"file" | "text" | "camera">("file");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState("");

  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(initialSource ?? null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GenerationResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetUpload = () => {
    setResult(null);
    setGenResult(null);
    setSelectedFile(null);
    setTextInput("");
    setError(null);
    if (initialSource) router.replace("/upload");
  };

  const selectFile = (file: File) => {
    if (!file.size || file.size > MAX_UPLOAD_BYTES) {
      setError("SELECT A NON-EMPTY FILE UNDER 10 MIB.");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setError(null);
    setResult(null);
    setGenResult(null);
  };

  const processFileExtraction = async (fileToProcess: File, inputType: "file" | "camera") => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setGenResult(null);

    const ext = fileToProcess.name.split(".").pop()?.toLowerCase() || "";
    const isImage = inputType === "camera" || fileToProcess.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "tif", "tiff"].includes(ext);
    const isPdf = ext === "pdf" || fileToProcess.type === "application/pdf";

    if (isImage) {
      setProcessingStatus("RUNNING OCR TEXT RECOGNITION... THIS MAY TAKE A FEW SECONDS.");
    } else if (isPdf) {
      setProcessingStatus("READING PDF PAGES AND SCANNING IMAGES...");
    } else {
      setProcessingStatus("READING TEXT FILE CONTENT...");
    }

    try {
      const formData = new FormData();
      formData.append("file", fileToProcess);
      formData.append("type", inputType);

      const res = await fetch("/api/extract", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "CONTENT EXTRACTION FAILED.");
      }

      setResult({
        uploadId: data.uploadId,
        fileName: data.fileName,
        fileType: data.fileType,
        extractedText: data.extractedText,
        charCount: data.charCount,
        uncertain: data.uncertain,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "FAILED TO EXTRACT TEXT FROM MATERIAL.");
    } finally {
      setIsProcessing(false);
      setProcessingStatus("");
    }
  };

  const handleUploadSubmit = () => {
    if (!selectedFile) {
      setError("PLEASE SELECT A FILE FIRST (PDF, PNG, JPG, OR TXT).");
      return;
    }
    processFileExtraction(selectedFile, "file");
  };

  const handleTextSubmit = () => {
    const trimmedText = textInput.trim();
    if (trimmedText.length < 15) {
      setError("PLEASE ENTER AT LEAST 15 CHARACTERS OF STUDY CONTENT.");
      return;
    }

    const textFile = new File([trimmedText], "pasted-study-content.txt", {
      type: "text/plain",
    });
    setSelectedFile(textFile);
    processFileExtraction(textFile, "file");
  };

  const handleCameraCapture = (capturedFile: File) => {
    setSelectedFile(capturedFile);
    processFileExtraction(capturedFile, "camera");
  };

  const handleGenerateQuestions = async () => {
    if (!result?.uploadId) return;

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId: result.uploadId, count: 50 }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.error || "QUESTION GENERATION FAILED.");
      }

      setGenResult({
        count: data.count,
        uploadId: data.uploadId,
        note: data.note,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "FAILED TO GENERATE QUESTIONS FROM MATERIAL.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <main>
        <div className={styles.header}>
          <SectionTag>INGESTION & GENERATION PIPELINE</SectionTag>
          <h1>UPLOAD & GENERATE QUIZ BANK</h1>
          <p className={styles.subtitle}>
            UPLOAD A PDF, IMAGE, DOCUMENT OR SLIDE DECK. YOU CAN ALSO PASTE NOTES OR TAKE A PHOTO.
          </p>
        </div>

        {/* Tab Selection */}
        {!result && !genResult && (
          <div className={styles.tabContainer}>
            <Button
              variant={activeTab === "file" ? "primary" : "outline"}
              onClick={() => {
                setActiveTab("file");
                setError(null);
              }}
            >
              📁 FILE UPLOAD
            </Button>
            <Button
              variant={activeTab === "text" ? "primary" : "outline"}
              onClick={() => {
                setActiveTab("text");
                setError(null);
              }}
            >
              ✍️ PASTE TEXT
            </Button>
            <Button
              variant={activeTab === "camera" ? "primary" : "outline"}
              onClick={() => {
                setActiveTab("camera");
                setError(null);
              }}
            >
              📷 LIVE CAMERA PHOTO
            </Button>
          </div>
        )}

        {/* Extraction Error Box */}
        {error && (
          <div className={styles.errorBox} role="alert">
            <p>⚠ {error}</p>
            <Button
              variant="dark"
              onClick={() => setError(null)}
              style={{ marginTop: "12px" }}
            >
              DISMISS & RETRY
            </Button>
          </div>
        )}

        {/* Active Tab Content */}
        {!result && !genResult && !isProcessing && (
          <>
            {activeTab === "file" && (
              <Card accent="cyan" className={styles.uploadCard}>
                <h3>SELECT FILE FROM YOUR DEVICE</h3>
                <p className={styles.metaInfo}>{UPLOAD_FORMATS} · UP TO 10 MIB</p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(event) => { const file = event.target.files?.[0]; if (file) selectFile(file); }}
                  aria-label="Study material file"
                  accept={UPLOAD_EXTENSIONS}
                  className={styles.fileInput}
                />

                <button
                  type="button"
                  className={styles.dropZone}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const file = event.dataTransfer.files[0];
                    if (file) selectFile(file);
                  }}
                >
                  {selectedFile ? (
                    <span className={styles.selectedFileInfo}>
                      <span className={styles.fileIcon}>📄</span>
                      <span>
                        <strong>{selectedFile.name.toUpperCase()}</strong>
                        <span className={styles.fileSize}>
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </span>
                      </span>
                    </span>
                  ) : (
                    <span className={styles.emptyDropZone}>
                      <span className={styles.uploadIcon}>⬆</span>
                      <span>CHOOSE OR DROP A FILE</span>
                    </span>
                  )}
                </button>

                <Button
                  variant="dark"
                  onClick={handleUploadSubmit}
                  disabled={!selectedFile}
                  style={{ width: "100%", marginTop: "16px" }}
                >
                  EXTRACT CONTENT
                </Button>
              </Card>
            )}

            {activeTab === "text" && (
              <Card accent="yellow" className={styles.uploadCard}>
                <h3>PASTE YOUR STUDY CONTENT</h3>
                <p className={styles.metaInfo}>
                  ADD NOTES, A QUESTION BANK, OR ANY TEXT YOU WANT TO TURN INTO MCQS
                </p>
                <textarea
                  className={styles.textInput}
                  value={textInput}
                  onChange={(event) => {
                    setTextInput(event.target.value);
                    setError(null);
                  }}
                  placeholder="PASTE YOUR STUDY MATERIAL HERE..."
                  aria-label="Study material text"
                  rows={10}
                  maxLength={MAX_TEXT_LENGTH}
                />
                <div className={styles.textInputFooter}>
                  <span>{textInput.length.toLocaleString()} CHARACTERS</span>
                  <span>MINIMUM 15 CHARACTERS</span>
                </div>
                <Button
                  variant="dark"
                  onClick={handleTextSubmit}
                  disabled={!textInput.trim()}
                  style={{ width: "100%", marginTop: "16px" }}
                >
                  EXTRACT CONTENT
                </Button>
              </Card>
            )}

            {activeTab === "camera" && (
              <CameraCapture onCapture={handleCameraCapture} />
            )}
          </>
        )}

        {/* Processing Extraction State */}
        {isProcessing && (
          <Card accent="yellow" className={styles.processingCard}>
            <SectionTag>PROCESSING MATERIAL</SectionTag>
            <h2>EXTRACTING TEXT CONTENT...</h2>
            <div className={styles.spinnerBar}></div>
            <p className={styles.statusText} role="status" aria-live="polite">{processingStatus}</p>
          </Card>
        )}

        {/* Generating Questions State */}
        {isGenerating && (
          <Card accent="yellow" className={styles.processingCard}>
            <SectionTag>AI GENERATION IN PROGRESS</SectionTag>
            <h2>GENERATING UP TO 50 QUESTIONS...</h2>
            <div className={styles.spinnerBar}></div>
            <p className={styles.statusText}>
              ANALYZING MATERIAL, CREATING 4 DISTINCT OPTIONS, CORRECT ANSWER & EXPLANATIONS...
            </p>
          </Card>
        )}

        {/* Generation Success View */}
        {genResult && !isGenerating && (
          <Card accent="yellow" className={styles.resultCard}>
            <SectionTag>GENERATION COMPLETE</SectionTag>
            <h2>{genResult.count} NEW QUESTIONS SAVED</h2>
            {genResult.note && <p role="status">{genResult.note}</p>}
            <div className={styles.resultActions}>
              <Button variant="primary" onClick={() => router.push("/dashboard")}>
                OPEN DASHBOARD
              </Button>
              <Button variant="outline" onClick={handleGenerateQuestions}>
                GENERATE MORE FROM THIS SOURCE
              </Button>
              <Button variant="outline" onClick={resetUpload}>
                UPLOAD ANOTHER FILE
              </Button>
            </div>
          </Card>
        )}

        {/* Extraction Success Result View */}
        {result && !genResult && !isGenerating && (
          <Card accent="green" className={styles.resultCard}>
            <SectionTag>EXTRACTION SUCCESSFUL</SectionTag>
            <h2>CONTENT EXTRACTED SUCCESSFULLY</h2>

            <div className={styles.metaGrid}>
              <div>
                <strong>SOURCE FILE:</strong> {result.fileName.toUpperCase()}
              </div>
              <div>
                <strong>INPUT TYPE:</strong> {result.fileType.toUpperCase()}
              </div>
              <div>
                <strong>CHARACTERS EXTRACTED:</strong> {result.charCount} CHARS
              </div>
            </div>

            {result.uncertain && <p role="status">⚠ Some pages or words may have been read incorrectly. Check the preview before generating.</p>}
            <div className={styles.previewBox}>
              <div className={styles.previewHeader}>TEXT PREVIEW:</div>
              <pre className={styles.previewContent}>{result.extractedText}</pre>
            </div>

            <div className={styles.resultActions}>
              <Button variant="primary" onClick={handleGenerateQuestions}>
                GENERATE QUESTIONS
              </Button>
              <Button
                variant="outline"
                onClick={resetUpload}
              >
                UPLOAD ANOTHER FILE
              </Button>
            </div>
          </Card>
        )}
      </main>
    </>
  );
}
