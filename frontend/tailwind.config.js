/** @type {import('tailwindcss').Config} */
// ธีมสีเขียวอมฟ้า น้ำเงินเข้ม และงาช้าง
const teal = {
  50: "#EFF9F8", 100: "#D8F0ED", 200: "#B5E4DE", 300: "#83D2C9", 400: "#4BB7AE",
  500: "#258F8B", 600: "#1C7475", 700: "#195D63", 800: "#174B54", 900: "#143D49", 950: "#0B2936"
};
const aqua = {
  50: "#F1F8F9", 100: "#DCEFF1", 200: "#B7DFE3", 300: "#87C9D0", 400: "#55AEBB", 500: "#328F9F",
  600: "#267484", 700: "#215C6D", 800: "#1C4658", 900: "#163344", 950: "#0D2332"
};
const warm = {
  50: "#FAF8F5", 100: "#F3EFE9", 200: "#E6DFD5", 300: "#D2C8BA", 400: "#A79C8E", 500: "#7D7266",
  600: "#5E554C", 700: "#463F38", 800: "#302B26", 900: "#211D1A", 950: "#14110F"
};
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        blue: teal,
        indigo: teal,
        sky: aqua,
        slate: warm,
        maroon: teal,
        gold: aqua,
        navy: { 950: "#0B2936", 900: "#143D49", 800: "#174B54" },
        brand: "#1C7475",
        success: "#16A36A",
        warning: "#F59E0B",
        danger: "#DC2626"
      },
      fontFamily: { sans: ["Sarabun", "Leelawadee UI", "Tahoma", "sans-serif"] }, fontSize: { xs: ["0.875rem", { lineHeight: "1.25rem" }], sm: ["1rem", { lineHeight: "1.5rem" }], base: ["1.125rem", { lineHeight: "1.75rem" }], lg: ["1.25rem", { lineHeight: "1.75rem" }], xl: ["1.375rem", { lineHeight: "1.875rem" }], "2xl": ["1.75rem", { lineHeight: "2.25rem" }], "3xl": ["2.125rem", { lineHeight: "2.5rem" }], "4xl": ["2.5rem", { lineHeight: "2.75rem" }], "5xl": ["3.25rem", { lineHeight: "1" }], "6xl": ["4rem", { lineHeight: "1" }], "7xl": ["4.75rem", { lineHeight: "1" }], "8xl": ["6.5rem", { lineHeight: "1" }], "9xl": ["8.5rem", { lineHeight: "1" }] }
    }
  },
  plugins: []
};
