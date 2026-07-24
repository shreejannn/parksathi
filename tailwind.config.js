/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#0B1220",
          900: "#111A2E",
          800: "#16213E",
          700: "#1F2C4F",
        },
        signal: {
          amber: "#FFC94A",
          green: "#33C46B",
          red: "#EF5B5B",
        },
        paper: "#F5F7FA",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        card: "0 8px 24px -12px rgba(11,18,32,0.25)",
      },
    },
  },
  plugins: [],
};
