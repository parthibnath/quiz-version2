"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import styles from "./Navbar.module.css";

export function SignOutButton() {
  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <button
      onClick={handleSignOut}
      className={styles.ghostBtn}
    >
      LOG OUT
    </button>
  );
}
