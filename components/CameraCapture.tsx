"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "./Button";
import { SectionTag } from "./SectionTag";
import styles from "./CameraCapture.module.css";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel?: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    let stream: MediaStream | undefined;
    setReady(false);
    setError(null);
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: false });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        if (active) setError("Camera unavailable. Allow camera access on HTTPS or localhost, or upload a photo.");
      }
    }
    void start();
    return () => {
      active = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [facingMode, retry]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 2400 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob && videoRef.current === video) {
        onCapture(new File([blob], `camera_capture_${Date.now()}.jpg`, { type: "image/jpeg" }));
      }
    }, "image/jpeg", 0.9);
  };

  return (
    <div className={styles.cameraBox}>
      <SectionTag>LIVE CAMERA CAPTURE</SectionTag>
      {error && (
        <div className={styles.errorBox} role="alert">
          <p>⚠ {error}</p>
          <Button variant="dark" onClick={() => setRetry((previous) => previous + 1)}>RETRY CAMERA</Button>
        </div>
      )}
      <div className={styles.videoWrapper} hidden={!!error}>
        <video ref={videoRef} autoPlay playsInline muted onCanPlay={() => setReady(true)} className={styles.video} />
      </div>
      <div className={styles.controls}>
        <Button variant="primary" onClick={capturePhoto} disabled={!ready || !!error}>📷 TAKE PHOTO</Button>
        <Button variant="outline" onClick={() => setFacingMode((mode) => mode === "user" ? "environment" : "user")}>
          SWITCH CAMERA
        </Button>
        {onCancel && <Button variant="dark" onClick={onCancel}>CANCEL</Button>}
      </div>
    </div>
  );
}
