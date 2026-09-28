"use client";

import React, { useState } from "react";
import styles from "./Navbar.module.css";
import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

interface NavbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className={styles.navbar}>
      <Link href="/" className={styles.logo}>
        QUIZ.PLATFORM
      </Link>

      <button
        className={styles.hamburger}
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label="Toggle navigation menu"
        aria-expanded={mobileOpen}
        aria-controls="primary-navigation"
        type="button"
      >
        <span className={styles.hamburgerBar}></span>
        <span className={styles.hamburgerBar}></span>
        <span className={styles.hamburgerBar}></span>
      </button>

      <nav id="primary-navigation" className={`${styles.navLinks} ${mobileOpen ? styles.navLinksOpen : ""}`}>
        {user ? (
          <>
            <Link href="/dashboard" className={styles.link}>DASHBOARD</Link>
            <Link href="/upload" className={styles.link}>UPLOAD MATERIAL</Link>
            <SignOutButton />
          </>
        ) : (
          <>
            <Link href="/login" className={styles.ghostBtn}>
              LOG IN
            </Link>
            <Link href="/signup" className={styles.yellowBtn}>
              GET STARTED
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
