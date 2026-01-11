const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        neon: "#e8fe41",
        danger: "#9d271e",
      },
      fontFamily: {
        sans: ["Inter Display", "sans-serif"],
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: "#e8fe41",
              foreground: "#000000",
            },
            secondary: {
              DEFAULT: "#000000",
              foreground: "#ffffff",
            },
            danger: {
              DEFAULT: "#9d271e",
              foreground: "#ffffff",
            },
          },
        },
      },
    }),
  ],
};
