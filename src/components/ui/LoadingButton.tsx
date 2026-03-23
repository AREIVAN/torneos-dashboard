"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: ReactNode;
}

const variants = {
  primary: "border-brand-stroke/45 bg-linear-to-r from-brand-stroke/30 to-brand-neon/10 shadow-[inset_0_0_0_1px_rgba(122,63,255,0.12)] text-brand-text",
  secondary: "border-brand-neon/25 bg-brand-panel2/55 text-brand-text",
  danger: "border-brand-hot/25 bg-brand-hot/10 text-brand-hot",
  ghost: "border-transparent bg-transparent text-brand-muted hover:text-brand-text hover:bg-brand-panel2/40",
};

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ isLoading, loadingText, variant = "primary", children, className = "", disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          relative inline-flex items-center justify-center gap-2
          px-4 py-2.5 rounded-xl text-sm font-extrabold tracking-wide
          border transition-all cursor-pointer
          hover:brightness-110
          disabled:opacity-50 disabled:cursor-not-allowed
          focus-visible:outline-2 focus-visible:outline-brand-neon focus-visible:outline-offset-2
          ${variants[variant]}
          ${className}
        `}
        {...props}
      >
        {isLoading && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <svg
              className="w-5 h-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {loadingText && <span className="ml-2">{loadingText}</span>}
          </motion.span>
        )}
        <span className={isLoading && !loadingText ? "invisible" : isLoading ? "invisible" : ""}>
          {children}
        </span>
      </button>
    );
  }
);

LoadingButton.displayName = "LoadingButton";
