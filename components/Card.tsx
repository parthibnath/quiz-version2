import React from "react";
import styles from "./Card.module.css";

interface CardProps {
  children: React.ReactNode;
  accent?: "yellow" | "magenta" | "cyan" | "purple" | "green" | "orange";
  className?: string;
}

export function Card({ children, accent, className = "" }: CardProps) {
  const accentClass = accent ? styles[accent] : "";
  return (
    <div className={`${styles.card} ${accentClass} ${className}`}>
      {children}
    </div>
  );
}
