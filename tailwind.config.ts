import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#f5f1ee",
        paper: "#141a30",
        warm: "rgba(255,255,255,0.06)",
        line: "rgba(255,255,255,0.14)",
        moss: "#8a72b8",
        plum: "#5b3a6e",
        sun: "#b23b3b",
        action: "#b23b3b",
        google: "#00009c",
        surface: "rgba(255,255,255,0.06)"
      },
      boxShadow: {
        soft: "0 16px 40px rgba(0, 0, 0, 0.35)"
      },
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-quicksand)", "var(--font-space-grotesk)", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
