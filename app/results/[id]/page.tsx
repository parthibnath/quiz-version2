"use client";

import React, { useState, useEffect, use } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { SectionTag } from "@/components/SectionTag";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../results.module.css";

interface IncorrectItem {
  questionId: string;
  questionText: string;
  userChoiceIndex: number;
  userChoiceText: string;
  correctChoiceIndex: number;
  correctChoiceText: string;
  explanation: string;
  whyUserWasWrong: string;
}

interface ResultsData {
  sessionId: string;
  sessionNumber: number;
  score: number;
  total: number;
  percentage: number;
  incorrectList: IncorrectItem[];
}

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;
  const router = useRouter();

  useEffect(() => {
    document.title = `Results — MCQ Platform`;
  }, []);

  const [results, setResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to load cached session results from sessionStorage first
    const cached = sessionStorage.getItem(`session_results_${sessionId}`);
    if (cached) {
      try {
        setResults(JSON.parse(cached));
        setLoading(false);
        return;
      } catch (e) {
        // Fallback to fetch
      }
    }
    fetchResults();
  }, [sessionId]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResults({
        sessionId: data.sessionId,
        sessionNumber: data.sessionNumber,
        score: data.score || 0,
        total: data.total,
        percentage: Math.round(((data.score || 0) / data.total) * 100),
        incorrectList: data.incorrectList || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "FAILED TO LOAD RESULTS.");
    } finally {
      setLoading(false);
    }
  };

  const handleRetrySession = async () => {
    if (!results) return;
    try {
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionNumber: results.sessionNumber }),
      });
      const data = await res.json();
      if (res.ok && data.sessionId) {
        router.push(`/session/${data.sessionId}`);
      } else {
        router.push("/dashboard");
      }
    } catch (e) {
      router.push("/dashboard");
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main>
          <Card accent="yellow" className={styles.loadingCard}>
            <SectionTag>COMPUTING RESULTS</SectionTag>
            <h2>CALCULATING SCORE & REVIEW...</h2>
            <div className={styles.spinnerBar}></div>
          </Card>
        </main>
      </>
    );
  }

  if (!results) {
    return (
      <>
        <Navbar />
        <main>
          <Card accent="magenta">
            <SectionTag>RESULTS ERROR</SectionTag>
            <h2>{error || "NO RESULTS AVAILABLE FOR THIS SESSION."}</h2>
            <Link href="/dashboard" style={{ marginTop: "16px", display: "inline-block" }}>
              <Button variant="dark">RETURN TO DASHBOARD</Button>
            </Link>
          </Card>
        </main>
      </>
    );
  }

  const isPassed = results.percentage >= 70;
  const isFinalTakeover = results.sessionNumber === 11;

  return (
    <>
      <Navbar />
      <main>
        {/* Banner Section */}
        <div className={styles.header}>
          <SectionTag>
            {isFinalTakeover ? "FINAL TAKEOVER RESULTS" : `SESSION ${results.sessionNumber} RESULTS`}
          </SectionTag>
          <h1>SESSION COMPLETED</h1>
        </div>

        {/* Prominent Score Card */}
        <Card accent={isPassed ? "yellow" : "orange"} className={styles.scoreCard}>
          <div className={styles.scoreRow}>
            <div>
              <div className={styles.scoreLabel}>FINAL SCORE</div>
              <div className={styles.scoreBig}>
                {results.score} / {results.total}
              </div>
              <div className={styles.scorePercent}>{results.percentage}% ACCURACY</div>
            </div>

            <div className={styles.summaryBadge}>
              {isPassed ? "✓ SESSION PASSED" : "REVIEW REQUIRED"}
            </div>
          </div>

          <p className={styles.summaryText}>
            {isPassed
              ? "EXCELLENT PERFORMANCE! YOU HAVE DEMONSTRATED HIGH ACCURACY IN THIS STUDY MATERIAL SESSION."
              : "YOU COMPLETED THIS SESSION. REVIEW THE MISSED QUESTIONS BELOW TO REINFORCE YOUR WRONG ANSWERS."}
          </p>

          <div className={styles.actionsGroup}>
            <Link href="/dashboard">
              <Button variant="dark">🏠 RETURN TO DASHBOARD</Button>
            </Link>
            <Button variant="primary" onClick={handleRetrySession}>
              🔄 RETRY SESSION
            </Button>
          </div>
        </Card>

        {/* Incorrect Answer Breakdown Section */}
        <div className={styles.breakdownHeader}>
          <h2>
            INCORRECT ANSWER REVIEW ({results.incorrectList.length} MISSED)
          </h2>
        </div>

        {results.incorrectList.length === 0 ? (
          <Card accent="green" className={styles.perfectScoreCard}>
            <SectionTag>PERFECT SCORE</SectionTag>
            <h3>🎉 OUTSTANDING! YOU ANSWERED ALL {results.total} QUESTIONS CORRECTLY.</h3>
            <p style={{ marginTop: "8px", fontWeight: 700 }}>
              NO INCORRECT ANSWERS TO REVIEW FOR THIS SESSION.
            </p>
          </Card>
        ) : (
          <div className={styles.incorrectGrid}>
            {results.incorrectList.map((item, idx) => (
              <Card key={item.questionId || idx} className={styles.incorrectCard}>
                <div className={styles.cardTagRow}>
                  <SectionTag>MISSED ITEM #{idx + 1}</SectionTag>
                </div>

                <h3 className={styles.questionTitle}>{item.questionText}</h3>

                {/* User's Choice */}
                <div className={styles.choiceBoxUser}>
                  <span className={styles.choiceBadgeUser}>YOUR ANSWER ✖</span>
                  <p className={styles.choiceText}>{item.userChoiceText}</p>
                </div>

                {/* Correct Choice */}
                <div className={styles.choiceBoxCorrect}>
                  <span className={styles.choiceBadgeCorrect}>CORRECT ANSWER ✓</span>
                  <p className={styles.choiceText}>{item.correctChoiceText}</p>
                </div>

                {/* Explanations */}
                <div className={styles.explanationSection}>
                  <div className={styles.expBlock}>
                    <strong>WHY THE CORRECT ANSWER IS RIGHT:</strong>
                    <p>{item.explanation}</p>
                  </div>

                  <div className={styles.expBlock}>
                    <strong>WHY YOUR CHOICE WAS WRONG:</strong>
                    <p>{item.whyUserWasWrong}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
