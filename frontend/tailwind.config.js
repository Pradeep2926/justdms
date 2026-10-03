/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff8ff",
          100: "#dbeeff",
          200: "#b9ddff",
          300: "#7fc4ff",
          400: "#36a5ff",
          500: "#0785f5",
          600: "#0567dd",
          700: "#0751b4",
          800: "#0b448e",
          900: "#0d3974",
        },
        ink: {
          900: "#101828",
          800: "#1f2937",
          700: "#344054",
        },
        coral: {
          50: "#fff1f2",
          100: "#ffe4e6",
          500: "#f43f5e",
          600: "#e11d48",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)",
        card: "0 18px 45px -28px rgba(15, 23, 42, 0.32), 0 1px 0 rgba(255, 255, 255, 0.7) inset",
        glow: "0 18px 45px -20px rgba(7, 103, 221, 0.48)",
      },
    },
  },
  plugins: [],
};
