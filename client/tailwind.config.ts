import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./services/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
    "./utils/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--color-background) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        line: "rgb(var(--color-line) / <alpha-value>)",
        teal: "rgb(var(--color-teal) / <alpha-value>)",
        ember: "rgb(var(--color-ember) / <alpha-value>)",
        plum: "rgb(var(--color-plum) / <alpha-value>)",
        mint: "rgb(var(--color-mint) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          foreground: "rgb(var(--color-primary-foreground) / <alpha-value>)"
        }
      },
      boxShadow: {
        soft: "0 16px 40px rgb(var(--shadow-color) / 0.08)",
        elevated: "0 22px 55px rgb(var(--shadow-color) / 0.16)"
      }
    }
  },
  plugins: [require("@tailwindcss/forms")]
};

export default config;
