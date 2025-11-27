import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// Disabled Replit dev plugins to avoid interfering with HMR in local preview

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
      allow: [
        path.resolve(import.meta.dirname),
        path.resolve(import.meta.dirname, "attached_assets"),
      ],
    },
    // Proxy API and WebSocket to Express on :5000 to avoid CORS in dev
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
      },
      "/ws": {
        target: "ws://127.0.0.1:5000",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      "/gamews": {
        target: "ws://127.0.0.1:5000",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
    // Use default HMR settings to avoid invalid clientPort issues in preview
  },
});
