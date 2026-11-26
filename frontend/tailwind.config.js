/** @type {import('tailwindcss').Config} */
// Navy, blue, and sky colors matching the login screen
const teal = {
  50: "#EFF6FF", 100: "#DBEAFE", 200: "#BFDBFE", 300: "#93C5FD", 400: "#60A5FA",
  500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8", 800: "#1E40AF", 900: "#1E3A8A", 950: "#172554"
};
const aqua = {
  50: "#F0F9FF", 100: "#E0F2FE", 200: "#BAE6FD", 300: "#7DD3FC", 400: "#38BDF8", 500: "#0EA5E9",
  600: "#0284C7", 700: "#0369A1", 800: "#075985", 900: "#0C4A6E", 950: "#082F49"
};
const warm = {
  50: "#F8FAFC", 100: "#F1F5F9", 200: "#E2E8F0", 300: "#CBD5E1", 400: "#94A3B8", 500: "#64748B",
  600: "#475569", 700: "#334155", 800: "#1E293B", 900: "#0F172A", 950: "#020617"
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
        navy: { 950: "#071A38", 900: "#0E2A54", 800: "#163B72" },
        brand: "#123B82",
        success: "#16A36A",
        warning: "#F59E0B",
        danger: "#DC2626"
      },
      fontFamily: { sans: ["Sarabun", "Leelawadee UI", "Tahoma", "sans-serif"] }, fontSize: { xs: ["0.875rem", { lineHeight: "1.25rem" }], sm: ["1rem", { lineHeight: "1.5rem" }], base: ["1.125rem", { lineHeight: "1.75rem" }], lg: ["1.25rem", { lineHeight: "1.75rem" }], xl: ["1.375rem", { lineHeight: "1.875rem" }], "2xl": ["1.75rem", { lineHeight: "2.25rem" }], "3xl": ["2.125rem", { lineHeight: "2.5rem" }], "4xl": ["2.5rem", { lineHeight: "2.75rem" }], "5xl": ["3.25rem", { lineHeight: "1" }], "6xl": ["4rem", { lineHeight: "1" }], "7xl": ["4.75rem", { lineHeight: "1" }], "8xl": ["6.5rem", { lineHeight: "1" }], "9xl": ["8.5rem", { lineHeight: "1" }] }
    }
  },
  plugins: []
};
