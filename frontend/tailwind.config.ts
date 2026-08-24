import type { Config } from "tailwindcss"

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#FAFAFA",
        surface: "#FFFFFF",
        border: "#E5E7EB",
        ink: {
          primary: "#111827",
          secondary: "#6B7280",
          muted: "#9CA3AF",
        },
        accent: {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
        },
        warn: {
          50: "#FFFBEB",
          500: "#F59E0B",
          700: "#B45309",
        },
        danger: {
          50: "#FEF2F2",
          500: "#EF4444",
          700: "#B91C1C",
        },
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.15rem" }],
        base: ["0.875rem", { lineHeight: "1.3rem" }],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
      },
    },
  },
  plugins: [],
} satisfies Config
