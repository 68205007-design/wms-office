import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" ให้ใช้งานได้ทั้งบน GitHub Pages (/wms-office/) และ localhost
export default defineConfig({ plugins: [react()], envDir: "..", base: "./" });
