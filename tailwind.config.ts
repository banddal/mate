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
        ink: "#3b2b20",
        paper: "#fff7df",
        warm: "rgba(255,255,255,0.62)",
        line: "rgba(121,83,44,0.16)",
        moss: "#4fbd2f",
        plum: "#8b5b32",
        sun: "#d7bb3f",
        action: "#4fbd2f",
        google: "#00009c",
        surface: "rgba(255,255,255,0.68)"
      },
      boxShadow: {
        soft: "0 16px 36px rgba(127, 83, 38, 0.14)"
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
