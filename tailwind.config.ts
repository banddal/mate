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
        ink: "#1f2933",
        paper: "#f7f4ef",
        line: "#ded8cf",
        moss: "#5f7a62",
        plum: "#7b4964",
        sun: "#d8943d"
      },
      boxShadow: {
        soft: "0 16px 50px rgba(31, 41, 51, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
