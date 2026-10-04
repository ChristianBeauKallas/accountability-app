import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark theme. Token NAMES are kept so components flip in one place:
        //   ink   = primary text (now light)
        //   ground= app background (near-black)
        //   surface = elevated card/input background
        ink: "#F4F5F2",
        ground: "#0F1210",
        surface: "#191C1A",
        accent: {
          DEFAULT: "#4FB07A",
          dark: "#3E9A66",
          soft: "#17271F",
        },
        gold: "#F2B46B",
        "ink-2": "#E6E8E4",
        muted: {
          DEFAULT: "#9BA49E",
          2: "#767F79",
        },
        "muted-on-dark": "#A9B4AD",
        "soft-on-dark": "#C9D1CB",
        "body-2": "#C4CCC6",
        chip: "#20231F",
        track: "#272B28",
        border: "#2B302C",
        divider: "#242825",
        // Light accent chips/banners stay light (they sit on dark cards and pop)
        "warm-soft": "#F3E3CF",
        "warm-text": "#7A3E0C",
        // Standalone warning/error/danger text on dark backgrounds
        danger: "#F08A6B",
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
