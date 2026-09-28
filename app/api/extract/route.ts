import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createUpload, findUserById } from "@/lib/store";
import { createWorker } from "tesseract.js";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { enforceRateLimit } from "@/lib/rate-limit";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_TEXT_LENGTH = 100_000;
const SUPPORTED_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "webp", "txt", "md", "csv", "docx"]);

export async function POST(req: NextRequest) {
  if (!enforceRateLimit(req, "extract", 10, 60_000)) {
    return NextResponse.json({ error: "TOO MANY EXTRACTION REQUESTS. PLEASE TRY AGAIN LATER." }, { status: 429 });
  }
  const session = await auth();

  if (!session || !session.user?.email) {
    return NextResponse.json(
      { error: "UNAUTHORIZED ACCESS. PLEASE LOG IN FIRST." },
      { status: 401 }
    );
  }

  const user = await findUserById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "USER NOT FOUND." }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const fileValue = formData.get("file");
    const file = fileValue instanceof File ? fileValue : null;
    const inputType = (formData.get("type") as string) || "file";

    if (!file) {
      return NextResponse.json(
        { error: "NO FILE OR CAMERA IMAGE CAPTURED. PLEASE SELECT A FILE OR TAKE A PHOTO." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "FILE SIZE MUST BE BETWEEN 1 BYTE AND 10 MB." },
        { status: 413 }
      );
    }

    const fileName = file.name || (inputType === "camera" ? "camera_capture.png" : "uploaded_document");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedText = "";
    let detectedType: "pdf" | "image" | "text" | "camera" = "text";

    const mime = file.type.toLowerCase();
    const ext = fileName.split(".").pop()?.toLowerCase() || "";

    if (inputType !== "camera" && !SUPPORTED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: "UNSUPPORTED FILE TYPE. USE PDF, PNG, JPG, WEBP, DOCX, TXT, MD, OR CSV." },
        { status: 415 }
      );
    }

    if (inputType === "camera" || mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp"].includes(ext)) {
      detectedType = inputType === "camera" ? "camera" : "image";
      // Perform OCR using Tesseract.js
      const worker = await createWorker("eng");
      const ret = await worker.recognize(buffer);
      extractedText = ret.data.text ? ret.data.text.trim() : "";
      await worker.terminate();
    } else if (mime === "application/pdf" || ext === "pdf") {
      detectedType = "pdf";
      try {
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const textResult = await parser.getText();
        extractedText = textResult.text ? textResult.text.trim() : "";
        await parser.destroy();
      } catch (pdfErr) {
        extractedText = "";
      }

      // Scanned PDF fallback to OCR if extracted text is negligible
      if (!extractedText || extractedText.length < 20) {
        try {
          const worker = await createWorker("eng");
          const ret = await worker.recognize(buffer);
          if (ret.data.text && ret.data.text.trim().length > extractedText.length) {
            extractedText = ret.data.text.trim();
          }
          await worker.terminate();
        } catch (e) {
          // Keep original extracted text if OCR fallback fails
        }
      }
    } else if (
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      ext === "docx"
    ) {
      detectedType = "text";
      const docxResult = await mammoth.extractRawText({ buffer });
      extractedText = docxResult.value.trim();
    } else {
      // Direct text extraction (TXT, Markdown, CSV, etc.)
      detectedType = "text";
      extractedText = buffer.toString("utf-8").trim();
    }

    // Clean up whitespace
    extractedText = extractedText.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");

    if (extractedText.length > MAX_EXTRACTED_TEXT_LENGTH) {
      extractedText = extractedText.slice(0, MAX_EXTRACTED_TEXT_LENGTH);
    }

    if (!extractedText || extractedText.length < 15) {
      return NextResponse.json(
        {
          error:
            "THIS FILE APPEARS TO BE UNREADABLE OR HAS NO CLEAR TEXT CONTENT. PLEASE PROVIDE A CLEARER PHOTO OR TEXT-BASED DOCUMENT.",
        },
        { status: 400 }
      );
    }

    const uploadRecord = await createUpload(
      user.id,
      fileName,
      detectedType,
      extractedText,
      "done"
    );

    return NextResponse.json({
      success: true,
      uploadId: uploadRecord.id,
      fileName: uploadRecord.fileName,
      fileType: uploadRecord.fileType,
      extractedText: uploadRecord.extractedText,
      charCount: extractedText.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          err?.message ||
          "FAILED TO EXTRACT CONTENT FROM FILE. PLEASE ENSURE THE FILE IS NOT CORRUPTED AND TRY AGAIN.",
      },
      { status: 500 }
    );
  }
}
