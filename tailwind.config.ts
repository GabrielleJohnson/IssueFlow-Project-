import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        espresso: "#15110E",
        clay: "#211915",
        coral: "#FF6B4A",
        amber: "#F7B267",
        sage: "#8DB596",
        ochre: "#D99A2B",
        ember: "#E63946",
        ivory: "#F8EFE6",
        beige: "#B8A99A",
        bronze: "#3A2A22"
      },
      boxShadow: {
        glow: "0 24px 90px rgba(255, 107, 74, 0.14)",
        card: "0 18px 50px rgba(0, 0, 0, 0.28)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
