import React from "react";
import styles from "./Footer.module.css";
import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <Link href="/" className={styles.logo}>
            QUIZ.PLATFORM
          </Link>
          <p className={styles.copyright}>
            &copy; {currentYear} QUIZ.PLATFORM. ALL RIGHTS RESERVED.
          </p>
        </div>
        <div className={styles.right}>
          <Link href="/login" className={styles.link}>LOG IN</Link>
          <Link href="/signup" className={styles.link}>SIGN UP</Link>
          <Link href="/dashboard" className={styles.link}>DASHBOARD</Link>
          <Link href="/privacy" className={styles.link}>PRIVACY</Link>
          <Link href="/terms" className={styles.link}>TERMS</Link>
        </div>
      </div>
    </footer>
  );
}
