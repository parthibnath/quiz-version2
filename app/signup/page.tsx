"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { SectionTag } from "@/components/SectionTag";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import styles from "./signup.module.css";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSupabaseAuthErrorMessage } from "@/lib/supabase/auth-errors";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Sign Up — MCQ Platform";
  }, []);

  const signUpWithGoogle = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) setError(getSupabaseAuthErrorMessage(authError));
    } catch (configurationError) {
      setError(getSupabaseAuthErrorMessage(configurationError));
    }
  };

  return (
    <>
      <Navbar user={null} />
      <main className={styles.mainContainer}>
        <div className={styles.cardWrapper}>
          <Card>
            <SectionTag>CREATE ACCOUNT</SectionTag>
            <h1>JOIN THE PLATFORM</h1>

            {error && <div className={styles.errorBox}>⚠ {error}</div>}
            
            <p>CREATE YOUR ACCOUNT SECURELY WITH SUPABASE AUTHENTICATION.</p>
            <Button type="button" className={styles.submitBtn} onClick={signUpWithGoogle}>
              CONTINUE WITH GOOGLE
            </Button>

            <div className={styles.footerLink}>
              ALREADY HAVE AN ACCOUNT?{" "}
              <Link href="/login" className={styles.link}>
                LOG IN HERE
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
