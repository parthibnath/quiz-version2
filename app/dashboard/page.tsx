import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { findUserById } from "@/lib/store";
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

  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const user = await findUserById(session.user.id);
  const profile = user?.profile || {
    cumulativeScore: 0,
    sessionsCompleted: [],
    session11Completed: false,
    sessionHistory: [],
  };

  const completedSet = new Set(profile.sessionsCompleted);

  const sessions = Array.from({ length: 11 }, (_, i) => {
    const sessionNum = i + 1;
    const isSession11 = sessionNum === 11;
    const isCompleted = isSession11
      ? profile.session11Completed
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
            <h1>WELCOME, {user?.name.toUpperCase()}</h1>
          </div>
          <Link href="/upload">
            <Button variant="primary">UPLOAD STUDY MATERIAL</Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <Card accent="yellow">
            <div className={styles.statLabel}>CUMULATIVE SCORE</div>
            <div className={styles.statValue}>{profile.cumulativeScore}</div>
          </Card>
          
          <Card accent="cyan">
            <div className={styles.statLabel}>SESSIONS COMPLETED</div>
            <div className={styles.statValue}>
              {profile.sessionsCompleted.length} / 10
            </div>
          </Card>

          <Card accent={profile.session11Completed ? "green" : "magenta"}>
            <div className={styles.statLabel}>FINAL TAKEOVER</div>
            <div className={styles.statValue}>
              {profile.session11Completed ? "COMPLETED" : "LOCKED"}
            </div>
          </Card>
        </div>

        {/* Sessions Section */}
        <div className={styles.sessionsHeader}>
          <h2>PROGRESSION MAP</h2>
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
                    <span className={styles.statusUnlocked}>UNLOCKED</span>
                  ) : (
                    <span className={styles.statusLocked}>🔒 LOCKED</span>
                  )}
                </p>

                <div className={styles.sessionAction}>
                  {s.isUnlocked ? (
                    <StartSessionButton
                      sessionNumber={s.num}
                      isCompleted={s.isCompleted}
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
      </main>
    </>
  );
}
