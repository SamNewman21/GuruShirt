import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: "#0d0f12",
          panel: "#15181e",
          surface: "#1d222a",
          border: "#2a303c",
          accent: "#6366f1",
          accentHover: "#818cf8",
        },
      },
    },
  },
  plugins: [],
};
export default config;
