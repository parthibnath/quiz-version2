"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "./Button";
import { SectionTag } from "./SectionTag";
import styles from "./CameraCapture.module.css";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel?: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    setError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setError(
        "CAMERA ACCESS DENIED OR NOT AVAILABLE. PLEASE ALLOW PERMISSION IN YOUR BROWSER."
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `camera_capture_${Date.now()}.png`, {
          type: "image/png",
        });
        stopCamera();
        onCapture(file);
      }
    }, "image/png");
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  return (
    <div className={styles.cameraBox}>
      <SectionTag>LIVE CAMERA CAPTURE</SectionTag>

      {error ? (
        <div className={styles.errorBox}>
          <p>⚠ {error}</p>
          <Button variant="dark" onClick={startCamera} style={{ marginTop: "12px" }}>
            RETRY CAMERA
          </Button>
        </div>
      ) : (
        <div className={styles.videoWrapper}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={styles.video}
          />
        </div>
      )}

      <div className={styles.controls}>
        <Button
          variant="primary"
          onClick={capturePhoto}
          disabled={!stream || !!error}
        >
          📷 TAKE PHOTO
        </Button>
        <Button variant="outline" onClick={toggleCameraFacing} disabled={!stream}>
          🔄 SWITCH CAMERA
        </Button>
        {onCancel && (
          <Button variant="dark" onClick={onCancel}>
            CANCEL
          </Button>
        )}
      </div>
    </div>
  );
}
