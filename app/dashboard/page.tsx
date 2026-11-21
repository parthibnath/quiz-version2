import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getDashboard } from "@/lib/store";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/Card";
import { SectionTag } from "@/components/SectionTag";
import { Button } from "@/components/Button";
import { StartSessionButton } from "@/components/StartSessionButton";
import type { Metadata } from "next";
import Link from "next/link";
import styles from "./dashboard.module.css";

export const metadata: Metadata = {
  title: "Dashboard — MCQ Platform",
  description: "Your quiz progress, sessions, and scores.",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { profile, uploads, questionCount, active, completed } = await getDashboard(session.user.id);
  const completedSet = new Set(profile.sessions_completed);
  const activeSet = new Set(active.map((attempt) => attempt.session_number));
  const bestScores = new Map<number, number>();
  for (const attempt of profile.session_history) {
    bestScores.set(attempt.sessionNumber, Math.max(bestScores.get(attempt.sessionNumber) ?? 0, attempt.score));
  }

  const sessions = Array.from({ length: 11 }, (_, i) => {
    const sessionNum = i + 1;
    const isSession11 = sessionNum === 11;
    const isCompleted = isSession11
      ? profile.session_11_completed
      : completedSet.has(sessionNum);

    let isUnlocked = false;
    if (sessionNum === 1) {
      isUnlocked = true;
    } else if (isSession11) {
      isUnlocked = Array.from({ length: 10 }, (_, k) => k + 1).every((num) =>
        completedSet.has(num)
      );
    } else {
      isUnlocked = completedSet.has(sessionNum - 1);
    }

    return {
      num: sessionNum,
      isSession11,
      isCompleted,
      isUnlocked,
      questionCount: isSession11 ? 100 : 50,
    };
  });

  return (
    <>
      <Navbar user={session.user} />
      <main>
        <div className={styles.header}>
          <div>
            <SectionTag>USER PROFILE</SectionTag>
            <h1>WELCOME, {(profile.display_name || session.user.name || "LEARNER").toUpperCase()}</h1>
          </div>
          <Link href="/upload" className={styles.actionLink}>UPLOAD STUDY MATERIAL</Link>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <Card accent="yellow">
            <div className={styles.statLabel}>CUMULATIVE SCORE</div>
            <div className={styles.statValue}>{profile.cumulative_score}</div>
          </Card>
          
          <Card accent="cyan">
            <div className={styles.statLabel}>SESSIONS COMPLETED</div>
            <div className={styles.statValue}>
              {profile.sessions_completed.length} / 10
            </div>
          </Card>

          <Card accent="orange">
            <div className={styles.statLabel}>FINAL TAKEOVER</div>
            <div className={styles.statValue}>
              {profile.session_11_completed ? "COMPLETED" : sessions[10].isUnlocked ? "UNLOCKED" : "LOCKED"}
            </div>
          </Card>
        </div>

        {/* Sessions Section */}
        <div className={styles.sessionsHeader}>
          <h2>PROGRESSION MAP</h2>
          <p>{questionCount} QUESTIONS IN YOUR BANK · 50 UNIQUE QUESTIONS PER PRACTICE SESSION</p>
          {questionCount < 50 && <p>ADD {50 - questionCount} MORE QUESTIONS TO START SESSION 1.</p>}
        </div>

        <div className={styles.sessionsGrid}>
          {sessions.map((s, idx) => {
            const accents: Array<"yellow" | "cyan" | "magenta" | "purple" | "green" | "orange"> = [
              "cyan",
              "yellow",
              "orange",
            ];
            const accent = accents[idx % accents.length];

            return (
              <Card
                key={s.num}
                accent={accent}
                className={`${styles.sessionCard} ${
                  !s.isUnlocked ? styles.lockedCard : ""
                }`}
              >
                <div className={styles.sessionTagWrapper}>
                  <SectionTag>
                    {s.isSession11 ? "FINAL TAKEOVER" : `SESSION ${s.num}`}
                  </SectionTag>
                </div>

                <h3>{s.questionCount} QUESTIONS</h3>
                
                <p className={styles.sessionStatus}>
                  STATUS:{" "}
                  {s.isCompleted ? (
                    <span className={styles.statusCompleted}>✓ COMPLETED</span>
                  ) : s.isUnlocked ? (
                    <span className={styles.statusUnlocked}>{activeSet.has(s.num) ? "IN PROGRESS" : "UNLOCKED"}</span>
                  ) : (
                    <span className={styles.statusLocked}>🔒 LOCKED</span>
                  )}
                </p>

                {bestScores.has(s.num) && <p>BEST SCORE: {bestScores.get(s.num)} / {s.questionCount}</p>}
                <div className={styles.sessionAction}>
                  {s.isUnlocked ? (
                    <StartSessionButton
                      sessionNumber={s.num}
                      isCompleted={s.isCompleted}
                      isActive={activeSet.has(s.num)}
                      needsQuestions={s.num === 1 && questionCount < 50 && !activeSet.has(s.num) && !s.isCompleted}
                    />
                  ) : (
                    <Button variant="dark" disabled style={{ width: "100%" }}>
                      LOCKED
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {uploads.length > 0 && (
          <section className={styles.history}>
            <h2>RECENT STUDY MATERIAL</h2>
            <ul>
              {uploads.map((source) => <li key={source.id}><Link href={`/upload?source=${source.id}`}>{source.file_name}</Link></li>)}
            </ul>
          </section>
        )}

        {completed.length > 0 && (
          <section className={styles.history}>
            <h2>RECENT RESULTS</h2>
            <ul>
              {completed.map((attempt) => (
                <li key={attempt.id}>
                  <Link href={`/results/${attempt.id}`}>
                    {attempt.session_number === 11 ? "Final Takeover" : `Session ${attempt.session_number}`} · {attempt.score}/{attempt.total}
                  </Link>
                  {" · "}<time dateTime={attempt.completed_at}>{attempt.completed_at.slice(0, 10)}</time>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
