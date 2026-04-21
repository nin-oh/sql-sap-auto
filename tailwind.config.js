/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0a0b11",
          soft: "#0f121a",
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
        teal: "#34d399",
        cyan: "#22d3ee",
        pink: "#f472b6",
        amber: "#fbbf24",
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
      backgroundImage: {
        "accent-gradient":
          "linear-gradient(135deg, #7c5cff 0%, #6b4ff0 45%, #4a2dcf 100%)",
        "aurora-a":
          "radial-gradient(60% 60% at 20% 10%, rgba(124,92,255,0.35), transparent 70%)",
        "aurora-b":
          "radial-gradient(50% 50% at 85% 20%, rgba(34,211,238,0.18), transparent 70%)",
        "aurora-c":
          "radial-gradient(55% 55% at 50% 90%, rgba(52,211,153,0.14), transparent 70%)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124,92,255,0.35), 0 8px 30px rgba(124,92,255,0.25)",
        "glow-lg":
          "0 0 0 1px rgba(124,92,255,0.4), 0 18px 50px rgba(124,92,255,0.35)",
        panel:
          "0 1px 0 rgba(255,255,255,0.03) inset, 0 10px 30px rgba(0,0,0,0.35)",
        lift: "0 14px 40px rgba(0,0,0,0.55), 0 2px 0 rgba(255,255,255,0.04) inset",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: 0 }, "100%": { opacity: 1 } },
        slideUp: {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(124,92,255,0.5)" },
          "50%": { boxShadow: "0 0 0 12px rgba(124,92,255,0)" },
        },
        auroraA: {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(6%, 4%, 0) scale(1.12)" },
        },
        auroraB: {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(-5%, 6%, 0) scale(1.08)" },
        },
        auroraC: {
          "0%,100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(4%, -5%, 0) scale(1.15)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
        tick: {
          "0%": { transform: "translateY(40%)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
        },
        scan: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        gradientShift: {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        fadeIn: "fadeIn 200ms ease-out",
        slideUp: "slideUp 260ms cubic-bezier(0.22, 1, 0.36, 1)",
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
        auroraA: "auroraA 22s ease-in-out infinite",
        auroraB: "auroraB 28s ease-in-out infinite",
        auroraC: "auroraC 32s ease-in-out infinite",
        shimmer: "shimmer 1.6s linear infinite",
        tick: "tick 360ms cubic-bezier(0.22, 1, 0.36, 1)",
        scan: "scan 1.8s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        gradientShift: "gradientShift 8s ease infinite",
      },
    },
  },
  plugins: [],
};
