import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        border: "hsl(var(--border))",
        foreground: "hsl(var(--foreground))",
        background: "hsl(var(--background))",
      },
      borderColor: {
        DEFAULT: "hsl(var(--border))",
      },
      boxShadow: {
        glow: "0 0 15px rgba(14, 165, 233, 0.15)",
        "glow-lg": "0 0 30px rgba(14, 165, 233, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;
