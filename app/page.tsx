import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { SectionTag } from "@/components/SectionTag";
import type { Metadata } from "next";
import styles from "./page.module.css";
import { hasSupabasePublicConfig } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "QUIZ.PLATFORM — Auto-Generate MCQ Practice Questions",
  description:
    "Upload PDFs, images, text, or camera photos to auto-generate 4-option MCQ practice questions with detailed explanations across a structured 11-session progression.",
};

export default async function HomePage() {
  const supabaseConfigured = hasSupabasePublicConfig();
  const session = supabaseConfigured ? await auth() : null;

  if (session) {
    redirect("/dashboard");
  }

  const marqueeText =
    "UPLOAD PDFS • SCAN NOTES • AUTO-GENERATE MCQS • 10 SESSIONS OF 50 • FINAL TAKEOVER OF 100 • TRACK EVERY WRONG ANSWER • ";

  return (
    <>
      <Navbar user={null} />

      <main>
        {/* Hero Section */}
        <section className={styles.heroContainer}>
          <div className={styles.stickerBadge}>
            ⚡ FREE MVP — NO CARD NEEDED
          </div>

          <h1 className={styles.heroTitle}>
            TURN ANY PDF, PHOTO, OR NOTES INTO PRACTICE QUIZZES INSTANTLY
          </h1>

          <p className={styles.heroSubtitle}>
            Upload study materials or capture textbook pages with your camera.
            Auto-generate 4-option MCQs with in-depth explanations and conquer them across a structured 11-session progression.
          </p>

          {!supabaseConfigured && (
            <p
              role="status"
              style={{
                border: "2px solid var(--black)",
                padding: "12px 16px",
                background: "var(--accent-yellow)",
                fontWeight: 700,
                marginBottom: "24px",
              }}
            >
              Supabase is not configured. Add the variables from .env.example to
              .env.local before using authentication.
            </p>
          )}

          <div className={styles.heroCtas}>
            <Link href="/signup">
              <Button variant="primary">GET STARTED FREE ➔</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline">LOG IN</Button>
            </Link>
          </div>

          <div className={styles.heroBadges}>
            <span className={styles.heroBadgeItem}>📄 PDF / TXT / OCR</span>
            <span className={styles.heroBadgeItem}>📷 LIVE CAMERA CAPTURE</span>
            <span className={styles.heroBadgeItem}>🔒 SEQUENTIAL UNLOCKS</span>
            <span className={styles.heroBadgeItem}>💡 WRONG-ANSWER REVIEWS</span>
          </div>
        </section>

        {/* Marquee Strip */}
        <div className={styles.marqueeWrapper}>
          <div className={styles.marqueeTrack}>
            <span className={styles.marqueeContent}>
              {marqueeText.repeat(4)}
            </span>
          </div>
        </div>

        {/* Feature Grid (Bento Style) */}
        <section>
          <div className={styles.sectionHeader}>
            <SectionTag>POWERFUL PIPELINE</SectionTag>
            <h2>HOW QUIZ.PLATFORM WORKS</h2>
          </div>

          <div className={styles.bentoGrid}>
            <Card accent="cyan" className={styles.bentoCard}>
              <div>
                <SectionTag>STEP 01</SectionTag>
                <h3>1. UPLOAD OR SNAP MATERIAL</h3>
                <p>
                  Upload PDFs, text files, or clear images of your study notes. You can also capture textbook pages live using your phone camera. Built-in OCR extracts readable content in seconds.
                </p>
              </div>
              <div className={styles.bentoTag}>PDF • TXT • JPG • CAMERA</div>
            </Card>

            <Card accent="yellow" className={styles.bentoCard}>
              <div>
                <SectionTag>STEP 02</SectionTag>
                <h3>2. AUTO-GENERATE 4-OPTION MCQS</h3>
                <p>
                  Server-side AI analyzes your material and creates 4-option multiple-choice questions with verified correct answers and detailed explanations for why options are right or wrong.
                </p>
              </div>
              <div className={styles.bentoTag}>FACT-CHECKED • EXPLANATIONS</div>
            </Card>

            <Card accent="magenta" className={styles.bentoCard}>
              <div>
                <SectionTag>STEP 03</SectionTag>
                <h3>3. THE 11-SESSION GAUNTLET</h3>
                <p>
                  Play through 10 sequential 50-question sessions unlocked one by one. Complete all 10 to unlock Session 11: Final Takeover — a 100-question mixed exam across your full material bank.
                </p>
              </div>
              <div className={styles.bentoTag}>SEQUENTIAL UNLOCKS</div>
            </Card>
          </div>
        </section>

        {/* Why It Works (Sticker Callout Section) */}
        <section>
          <div className={styles.sectionHeader}>
            <SectionTag>PRODUCT FACTS</SectionTag>
            <h2>BUILT FOR RETENTION, NOT GUESSWORK</h2>
          </div>

          <div className={styles.stickersGrid}>
            <Card accent="yellow" className={styles.stickerCard1}>
              <SectionTag>WRONG-ANSWER BREAKDOWN</SectionTag>
              <h3>EVERY WRONG ANSWER EXPLAINED</h3>
              <p>
                No mysterious red checkmarks. When you miss a question, see what you picked, the correct option, why it&apos;s right, and why your selected choice was incorrect.
              </p>
            </Card>

            <Card accent="cyan" className={styles.stickerCard2}>
              <SectionTag>STRICT PROGRESSION</SectionTag>
              <h3>SEQUENTIAL SESSION LOCKING</h3>
              <p>
                Sessions 1–10 unlock strictly in order. You must complete all 50 questions of Session N before Session N+1 becomes playable.
              </p>
            </Card>

            <Card accent="orange" className={styles.stickerCard3}>
              <SectionTag>FINAL REVISION</SectionTag>
              <h3>SESSION 11: FINAL TAKEOVER</h3>
              <p>
                Once all 10 sessions are completed, unlock the final takeover — 100 mixed random questions drawn across your whole bank for the ultimate exam test.
              </p>
            </Card>

            <Card accent="green" className={styles.stickerCard4}>
              <SectionTag>SCORE PERSISTENCE</SectionTag>
              <h3>PROFILE HISTORY & SCORES</h3>
              <p>
                Your cumulative accuracy, completed sessions, and historical performance persist to your profile. Revisit past session results anytime.
              </p>
            </Card>
          </div>
        </section>

        {/* Final CTA Card */}
        <section>
          <Card accent="yellow" className={styles.finalCtaCard}>
            <SectionTag>GET STARTED NOW</SectionTag>
            <h2>TURN YOUR STUDY MATERIALS INTO PRACTICE MCQS</h2>
            <p className={styles.finalCtaSubtitle}>
              NO CREDIT CARD NEEDED • INSTANT GENERATION • PERSISTENT SCORES
            </p>
            <div style={{ marginTop: "24px" }}>
              <Link href="/signup">
                <Button variant="dark">CREATE FREE ACCOUNT ➔</Button>
              </Link>
            </div>
          </Card>
        </section>
      </main>
    </>
  );
}
