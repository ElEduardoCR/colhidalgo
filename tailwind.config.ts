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
        // Azul marino institucional de la Junta
        marino: {
          50: "#eef4fb",
          100: "#d9e7f5",
          200: "#b4cdea",
          300: "#83abd9",
          400: "#4d84c3",
          500: "#2a63a6",
          600: "#1d4d86",
          700: "#163a68",
          800: "#0e2b4e",
          900: "#0a2038",
          950: "#061527",
        },
        // Azul aqua (agua) para acentos y estados activos
        aqua: {
          50: "#ecfeff",
          100: "#cbfaff",
          200: "#a1f2fb",
          300: "#63e4f4",
          400: "#22cee8",
          500: "#06b6d4",
          600: "#0894b3",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
        // Neutros con un ligero tinte azul para que todo lea como un solo sistema
        pizarra: {
          DEFAULT: "#0e2b4e",
          soft: "#3d5a7a",
          mute: "#6b83a0",
          line: "#dce6f1",
          fill: "#f1f6fb",
          bg: "#f5f9fd",
        },
        // Alias heredados, ahora con tinte azul institucional
        ink: {
          DEFAULT: "#0e2b4e",
          soft: "#3d5a7a",
          mute: "#6b83a0",
        },
        paper: {
          DEFAULT: "#ffffff",
          soft: "#f5f9fd",
          mute: "#f1f6fb",
          line: "#dce6f1",
        },
        // Semanticos para estados de pago
        exito: { DEFAULT: "#0f9b7a", soft: "#e6f7f2", ink: "#0a6e56" },
        alerta: { DEFAULT: "#c2410c", soft: "#fff1e8", ink: "#9a3412" },
        aviso: { DEFAULT: "#b45309", soft: "#fef6e7", ink: "#92400e" },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "SF Pro Display",
          "Segoe UI",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(14,43,78,0.05), 0 8px 24px rgba(14,43,78,0.07)",
        cardHover: "0 2px 4px rgba(14,43,78,0.07), 0 12px 32px rgba(14,43,78,0.12)",
        marino: "0 8px 24px rgba(14,43,78,0.28)",
      },
      backgroundImage: {
        "marino-grad": "linear-gradient(160deg, #0e2b4e 0%, #0a2038 55%, #061527 100%)",
        "aqua-grad": "linear-gradient(135deg, #06b6d4 0%, #0894b3 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
