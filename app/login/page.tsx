"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { SectionTag } from "@/components/SectionTag";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import styles from "../signup/signup.module.css";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSupabaseAuthErrorMessage } from "@/lib/supabase/auth-errors";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const signInWithGoogle = async () => {
    setIsPending(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (authError) {
        setError(getSupabaseAuthErrorMessage(authError));
        setIsPending(false);
      }
    } catch (configurationError) {
      setError(getSupabaseAuthErrorMessage(configurationError));
      setIsPending(false);
    }
  };

  useEffect(() => {
    document.title = "Log In — MCQ Platform";
  }, []);

  return (
    <>
      <Navbar user={null} />
      <main className={styles.mainContainer}>
        <div className={styles.cardWrapper}>
          <Card>
            <SectionTag>AUTHENTICATION</SectionTag>
            <h1>LOG IN</h1>
            
            {error && (
                <div className={styles.errorBox}>
                  ⚠ {error}
                </div>
              )}
            <Button type="button" onClick={signInWithGoogle} disabled={isPending} className={styles.submitBtn}>
              {isPending ? "REDIRECTING..." : "CONTINUE WITH GOOGLE"}
            </Button>

            <div className={styles.footerLink}>
              DON'T HAVE AN ACCOUNT?{" "}
              <Link href="/signup" className={styles.link}>
                SIGN UP HERE
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
