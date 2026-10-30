import type { Config } from "tailwindcss";

// DESIGN.md §10 (v6 Ops Navy). Values live as CSS variables in src/app/globals.css.

// color-mix keeps opacity modifiers (e.g. bg-slate-900/85) working on hex variables.
const token = (name: string) => `color-mix(in srgb, var(${name}) calc(<alpha-value> * 100%), transparent)`;
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        slate: {
          50: token("--slate-50"),
          100: token("--slate-100"),
          200: token("--slate-200"),
          300: token("--slate-300"),
          400: token("--slate-400"),
          500: token("--slate-500"),
          600: token("--slate-600"),
          700: token("--slate-700"),
          800: token("--slate-800"),
          900: token("--slate-900"),
          950: token("--slate-950"),
        },
        accent: { DEFAULT: token("--accent"), hover: token("--accent-hover"), tint: token("--accent-tint"), ring: token("--accent-ring") },
        success: { DEFAULT: token("--success"), tint: token("--success-tint"), dot: token("--success-dot") },
        warning: { DEFAULT: token("--warning"), tint: token("--warning-tint"), dot: token("--warning-dot") },
        error: { DEFAULT: token("--error"), tint: token("--error-tint"), dot: token("--error-dot") },
        info: { DEFAULT: token("--info"), tint: token("--info-tint"), dot: token("--info-dot") },
      },
      borderRadius: {
        none: "0",
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        full: "9999px",
      },
      boxShadow: {
        overlay: "var(--shadow-overlay)",
        none: "none",
      },
    },
  },
  plugins: [],
};

export default config;
