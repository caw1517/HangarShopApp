import type { Config } from "tailwindcss";

// DESIGN.md §10 (v6 Ops Navy). Values live as CSS variables in src/app/globals.css.
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
          50: "var(--slate-50)",
          100: "var(--slate-100)",
          200: "var(--slate-200)",
          300: "var(--slate-300)",
          400: "var(--slate-400)",
          500: "var(--slate-500)",
          600: "var(--slate-600)",
          700: "var(--slate-700)",
          800: "var(--slate-800)",
          900: "var(--slate-900)",
          950: "var(--slate-950)",
        },
        accent: { DEFAULT: "var(--accent)", hover: "var(--accent-hover)", tint: "var(--accent-tint)", ring: "var(--accent-ring)" },
        success: { DEFAULT: "var(--success)", tint: "var(--success-tint)", dot: "var(--success-dot)" },
        warning: { DEFAULT: "var(--warning)", tint: "var(--warning-tint)", dot: "var(--warning-dot)" },
        error: { DEFAULT: "var(--error)", tint: "var(--error-tint)", dot: "var(--error-dot)" },
        info: { DEFAULT: "var(--info)", tint: "var(--info-tint)", dot: "var(--info-dot)" },
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
