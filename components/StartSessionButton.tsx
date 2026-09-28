"use client";

import React, { useState } from "react";
import { Button } from "./Button";
import { useRouter } from "next/navigation";

interface StartSessionButtonProps {
  sessionNumber: number;
  isCompleted: boolean;
}

export function StartSessionButton({
  sessionNumber,
  isCompleted,
}: StartSessionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionNumber }),
      });

      const data = await res.json();

      if (!res.ok || !data.sessionId) {
        alert(data.error || "FAILED TO START SESSION.");
        setLoading(false);
        return;
      }

      router.push(`/session/${data.sessionId}`);
    } catch (err: any) {
      alert(err?.message || "ERROR STARTING SESSION.");
      setLoading(false);
    }
  };

  return (
    <Button
      variant="primary"
      onClick={handleStart}
      disabled={loading}
      style={{ width: "100%" }}
    >
      {loading
        ? "STARTING..."
        : isCompleted
        ? "RETRY SESSION"
        : "START SESSION"}
    </Button>
  );
}
