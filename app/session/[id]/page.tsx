"use client";

import React, { useState, useEffect, use } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { SectionTag } from "@/components/SectionTag";
import { useRouter } from "next/navigation";
import styles from "../session.module.css";

interface Question {
  id: string;
  questionText: string;
  options: [string, string, string, string];
}

interface SessionData {
  sessionId: string;
  sessionNumber: number;
  total: number;
  questions: Question[];
  savedAnswers: Record<string, number>;
}

export default function SessionPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    document.title = `Session ${sessionData?.sessionNumber || "..."} — MCQ Platform`;
  }, [sessionData]);

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  // Keyboard accessibility: 1..4 selects option, Left/Right arrow navigates
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSubmitting || !sessionData) return;
      const currentQ = sessionData.questions[currentIndex];
      if (!currentQ) return;

      if (["1", "2", "3", "4"].includes(e.key)) {
        const optionIndex = parseInt(e.key) - 1;
        selectOption(currentQ.id, optionIndex);
      } else if (e.key === "ArrowRight") {
        if (currentIndex < sessionData.questions.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      } else if (e.key === "ArrowLeft") {
        if (currentIndex > 0) {
          setCurrentIndex((prev) => prev - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, sessionData, isSubmitting, userAnswers]);

  const fetchSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "FAILED TO LOAD SESSION.");
      }

      setSessionData({
        sessionId: data.sessionId,
        sessionNumber: data.sessionNumber,
        total: data.total,
        questions: data.questions,
        savedAnswers: data.savedAnswers || {},
      });

      setUserAnswers(data.savedAnswers || {});
    } catch (err: any) {
      setError(err.message || "COULD NOT FETCH SESSION DATA.");
    } finally {
      setLoading(false);
    }
  };

  const selectOption = (questionId: string, optionIndex: number) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmitSession = async () => {
    if (!sessionData) return;

    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount < sessionData.total) {
      const confirmSubmit = window.confirm(
        `YOU HAVE ANSWERED ${answeredCount} OF ${sessionData.total} QUESTIONS. ARE YOU SURE YOU WANT TO SUBMIT NOW?`
      );
      if (!confirmSubmit) return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAnswers }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "FAILED TO SUBMIT SESSION.");
      }

      // Store results in sessionStorage for immediate rendering on results page
      sessionStorage.setItem(`session_results_${sessionId}`, JSON.stringify(data));
      router.push(`/results/${sessionId}`);
    } catch (err: any) {
      setError(err.message || "FAILED TO SUBMIT QUIZ ANSWERS.");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main>
          <Card accent="yellow" className={styles.loadingCard}>
            <SectionTag>LOADING QUIZ SESSION</SectionTag>
            <h2>PREPARING QUESTIONS...</h2>
            <div className={styles.spinnerBar}></div>
          </Card>
        </main>
      </>
    );
  }

  if (error || !sessionData || !sessionData.questions || sessionData.questions.length === 0) {
    return (
      <>
        <Navbar />
        <main>
          <div className={styles.errorBox}>
            <p>⚠ {error || "NO QUESTIONS AVAILABLE IN THIS SESSION."}</p>
            <Button variant="dark" onClick={() => router.push("/dashboard")} style={{ marginTop: "12px" }}>
              RETURN TO DASHBOARD
            </Button>
          </div>
        </main>
      </>
    );
  }

  const currentQuestion = sessionData.questions[currentIndex] || sessionData.questions[0];
  const selectedOption = currentQuestion ? userAnswers[currentQuestion.id] : undefined;
  const progressPercent = Math.round(
    ((currentIndex + 1) / sessionData.total) * 100
  );
  const answeredCount = Object.keys(userAnswers).length;

  return (
    <>
      <Navbar />
      <main>
        {/* Header Bar */}
        <div className={styles.headerBar}>
          <div>
            <SectionTag>
              {sessionData.sessionNumber === 11
                ? "FINAL TAKEOVER REVISION"
                : `SESSION ${sessionData.sessionNumber}`}
            </SectionTag>
            <h1>QUESTION {currentIndex + 1} OF {sessionData.total}</h1>
          </div>

          <div className={styles.progressStat} aria-live="polite">
            <span>ANSWERED: {answeredCount} / {sessionData.total}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className={styles.progressBarTrack}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {/* Main Quiz Question Card */}
        <Card className={styles.questionCard}>
          <div className={styles.questionText}>
            <h2>{currentQuestion.questionText}</h2>
          </div>

          <div className={styles.optionsGrid}>
            {currentQuestion.options.map((optionText, optIdx) => {
              const isSelected = selectedOption === optIdx;
              const optionLetter = ["A", "B", "C", "D"][optIdx];

              return (
                <button
                  key={optIdx}
                  type="button"
                  className={`${styles.optionBtn} ${
                    isSelected ? styles.optionSelected : ""
                  }`}
                  onClick={() => selectOption(currentQuestion.id, optIdx)}
                >
                  <span className={styles.optionBadge}>{optionLetter}</span>
                  <span className={styles.optionText}>{optionText}</span>
                  {isSelected && <span className={styles.checkMark}>✓</span>}
                </button>
              );
            })}
          </div>

          <p className={styles.keyboardHint}>
            💡 TIP: PRESS 1, 2, 3, 4 TO SELECT OPTIONS · ARROWS TO NAVIGATE
          </p>

          {/* Navigation Controls */}
          <div className={styles.navControls}>
            <Button
              variant="outline"
              onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
              disabled={currentIndex === 0}
            >
              ⬅ PREVIOUS
            </Button>

            {currentIndex < sessionData.total - 1 ? (
              <Button
                variant="primary"
                onClick={() => setCurrentIndex((prev) => prev + 1)}
              >
                NEXT ➔
              </Button>
            ) : (
              <Button
                variant="accent"
                accentColor="magenta"
                onClick={handleSubmitSession}
                disabled={isSubmitting}
              >
                {isSubmitting ? "SUBMITTING..." : "🏁 SUBMIT SESSION"}
              </Button>
            )}
          </div>
        </Card>
      </main>
    </>
  );
}
