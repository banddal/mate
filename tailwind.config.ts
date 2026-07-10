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
        paper: "#f4f3f1",
        warm: "rgba(255,255,255,0.62)",
        line: "rgba(159,109,179,0.18)",
        moss: "#cf5fa7",
        plum: "#8f4f9f",
        sun: "#e46f9d",
        action: "#cf5fa7",
        google: "#00009c",
        surface: "rgba(255,255,255,0.68)"
      },
      boxShadow: {
        soft: "0 16px 36px rgba(78, 72, 84, 0.11)"
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
