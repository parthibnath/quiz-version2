import React from "react";
import styles from "./SectionTag.module.css";

interface SectionTagProps {
  children: React.ReactNode;
}

export function SectionTag({ children }: SectionTagProps) {
  return <span className={styles.tag}>{children}</span>;
}
