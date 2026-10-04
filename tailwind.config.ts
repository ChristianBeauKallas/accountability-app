import type { Config } from "tailwindcss";

// Colors resolve from CSS variables (set per-theme in globals.css), so the
// same token names drive both the light and dark themes at runtime.
const t = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: t("--c-ink"),
        ground: t("--c-ground"),
        surface: t("--c-surface"),
        accent: {
          DEFAULT: t("--c-accent"),
          dark: t("--c-accent-dark"),
          soft: t("--c-accent-soft"),
        },
        gold: t("--c-gold"),
        "ink-2": t("--c-ink-2"),
        muted: {
          DEFAULT: t("--c-muted"),
          2: t("--c-muted-2"),
        },
        "muted-on-dark": t("--c-muted-on-dark"),
        "soft-on-dark": t("--c-soft-on-dark"),
        "body-2": t("--c-body-2"),
        chip: t("--c-chip"),
        track: t("--c-track"),
        border: t("--c-border"),
        divider: t("--c-divider"),
        "warm-soft": t("--c-warm-soft"),
        "warm-text": t("--c-warm-text"),
        danger: t("--c-danger"),
      },
      fontFamily: {
        // display / headings / big numbers
        display: ["var(--font-barlow)", "sans-serif"],
        // body / UI
        sans: ["var(--font-manrope)", "sans-serif"],
      },
      borderRadius: {
        card: "18px",
        btn: "12px",
        cta: "16px",
        seg: "14px",
        "seg-in": "10px",
        input: "12px",
        pill: "999px",
      },
      boxShadow: {
        // Dark-theme elevation: soft ambient depth so surfaces lift off the bg.
        card: "0 2px 10px rgba(0,0,0,0.45)",
        seg: "0 1px 2px rgba(0,0,0,0.4)",
        nav: "0 -8px 30px rgba(0,0,0,0.45)",
        sheet: "0 -16px 50px rgba(0,0,0,0.6)",
        tooltip: "0 12px 32px rgba(0,0,0,0.5)",
      },
      letterSpacing: {
        eyebrow: "0.06em",
        wordmark: "0.12em",
        tight: "-0.011em",
      },
      maxWidth: {
        app: "480px",
      },
    },
  },
  plugins: [],
};

export default config;
