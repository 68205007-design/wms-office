/** @type {import('tailwindcss').Config} */
// ธีมสีวิทยาลัยอาชีวศึกษาชุมพร: แดงเลือดหมู (จากตราวิทยาลัย) + ทอง + ครีม
const maroon = {
  50: "#FBF3F1", 100: "#F5E1DD", 200: "#EBC2BA", 300: "#DA9A8E", 400: "#C46E60",
  500: "#A8473A", 600: "#8E2A22", 700: "#7A231B", 800: "#631C16", 900: "#4E1612", 950: "#2E0C0A"
};
const gold = {
  50: "#FCF8EE", 100: "#F7ECD0", 200: "#EFD9A3", 300: "#E5C07B", 400: "#D9AA57", 500: "#C8963E",
  600: "#A97A2C", 700: "#875F23", 800: "#6B4B1F", 900: "#573D1B", 950: "#30200C"
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
        blue: maroon,
        indigo: maroon,
        sky: gold,
        slate: warm,
        maroon,
        gold,
        navy: { 950: "#4A1311", 900: "#6B1A17", 800: "#7D221D" },
        brand: "#8E2A22",
        success: "#16A36A",
        warning: "#F59E0B",
        danger: "#DC2626"
      },
      fontFamily: { sans: ["Sarabun", "Leelawadee UI", "Tahoma", "sans-serif"] }, fontSize: { xs: ["0.875rem", { lineHeight: "1.25rem" }], sm: ["1rem", { lineHeight: "1.5rem" }], base: ["1.125rem", { lineHeight: "1.75rem" }], lg: ["1.25rem", { lineHeight: "1.75rem" }], xl: ["1.375rem", { lineHeight: "1.875rem" }], "2xl": ["1.75rem", { lineHeight: "2.25rem" }], "3xl": ["2.125rem", { lineHeight: "2.5rem" }], "4xl": ["2.5rem", { lineHeight: "2.75rem" }], "5xl": ["3.25rem", { lineHeight: "1" }], "6xl": ["4rem", { lineHeight: "1" }], "7xl": ["4.75rem", { lineHeight: "1" }], "8xl": ["6.5rem", { lineHeight: "1" }], "9xl": ["8.5rem", { lineHeight: "1" }] }
    }
  },
  plugins: []
};
