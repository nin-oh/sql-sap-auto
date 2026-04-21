/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0d12",
          soft: "#10131a",
          panel: "#141824",
          elev: "#1a1f2e",
        },
        border: {
          DEFAULT: "#1f2637",
          soft: "#242c40",
        },
        accent: {
          DEFAULT: "#7c5cff",
          glow: "#9a82ff",
          soft: "#2a2350",
        },
        success: "#34d399",
        danger: "#ef4444",
        warn: "#f59e0b",
        muted: "#8a92a6",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124,92,255,0.35), 0 8px 30px rgba(124,92,255,0.25)",
        panel:
          "0 1px 0 rgba(255,255,255,0.03) inset, 0 10px 30px rgba(0,0,0,0.35)",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(124,92,255,0.5)" },
          "50%": { boxShadow: "0 0 0 10px rgba(124,92,255,0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 180ms ease-out",
        slideUp: "slideUp 220ms ease-out",
        pulseGlow: "pulseGlow 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
