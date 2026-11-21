"use client";

import { useState } from "react";
import { Button } from "./Button";
import { useRouter } from "next/navigation";

interface StartSessionButtonProps {
  sessionNumber: number;
  isCompleted: boolean;
  isActive: boolean;
  needsQuestions: boolean;
}

export function StartSessionButton({ sessionNumber, isCompleted, isActive, needsQuestions }: StartSessionButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionNumber }),
      });
      const data = await res.json();
      if (!res.ok || !data.sessionId) throw new Error(data.error || "Failed to start session.");
      router.push(`/session/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start session.");
      setLoading(false);
    }
  };

  let label = "START SESSION";
  if (needsQuestions) label = "ADD STUDY MATERIAL";
  else if (loading) label = "OPENING...";
  else if (isActive) label = "RESUME SESSION";
  else if (isCompleted) label = "RETRY SESSION";

  return (
    <>
      <Button
        variant="primary"
        onClick={needsQuestions ? () => router.push("/upload") : handleStart}
        disabled={loading}
        style={{ width: "100%" }}
      >
        {label}
      </Button>
      {error && <p role="alert">⚠ {error}</p>}
    </>
  );
}
