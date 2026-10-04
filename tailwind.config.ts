import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#13201A",
        ground: "#F5F4EF",
        surface: "#FFFFFF",
        accent: {
          DEFAULT: "#1F5C3D",
          dark: "#123B27",
          soft: "#DCE5DF",
        },
        gold: "#F2B46B",
        "ink-2": "#2A3A31",
        muted: {
          DEFAULT: "#5B665F",
          2: "#7A847E",
        },
        "muted-on-dark": "#A9B4AD",
        "soft-on-dark": "#C9D1CB",
        "body-2": "#3E4943",
        chip: "#F0EFE8",
        track: "#E9E8E1",
        border: "#D5D8D2",
        divider: "#E4E5DF",
        "warm-soft": "#F3E3CF",
        "warm-text": "#7A3E0C",
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
        card: "0 1px 2px rgba(19,32,26,0.06)",
        seg: "0 1px 2px rgba(19,32,26,0.1)",
        tooltip: "0 12px 32px rgba(0,0,0,0.3)",
      },
      letterSpacing: {
        eyebrow: "0.06em",
        wordmark: "0.12em",
      },
      maxWidth: {
        app: "480px",
      },
    },
  },
  plugins: [],
};

export default config;
