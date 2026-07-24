import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Rutas relativas: obligatorio para que funcione dentro del WebView de Android.
  base: "./",
  build: { outDir: "dist" },
  server: { host: true, port: 5173 },
});
