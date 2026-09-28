import React from "react";
import styles from "./Button.module.css";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "dark" | "outline" | "accent";
  accentColor?: "magenta" | "cyan" | "purple" | "green" | "orange";
}

export function Button({
  children,
  variant = "primary",
  accentColor,
  className = "",
  ...props
}: ButtonProps) {
  let variantClass = styles.primary;
  if (variant === "dark") variantClass = styles.dark;
  if (variant === "outline") variantClass = styles.outline;
  if (variant === "accent" && accentColor) {
    variantClass = styles[accentColor];
  }

  return (
    <button className={`${styles.button} ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
