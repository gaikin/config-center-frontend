import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: '.',
  plugins: [react()],
  server: {
    port: 5173,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true
      },
      "/healthz": {
        target: "http://localhost:8080",
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/antd") || id.includes("node_modules/@ant-design")) {
            return "antd-vendor";
          }
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/react-router-dom")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/styled-components") || id.includes("node_modules/zustand")) {
            return "state-style-vendor";
          }
          return undefined;
        }
      }
    }
  }
});
