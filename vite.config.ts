import { defineConfig } from "vite";

export default defineConfig({
  // Local-only by default: no LAN/public exposure, and Vite will not enumerate
  // every network interface in the startup banner.
  // Need phone/LAN access? run: npm run dev -- --host 0.0.0.0
  server: { host: "127.0.0.1", port: 5173, strictPort: true },
  preview: { host: "127.0.0.1", port: 4173 },
  build: { target: "es2022", assetsInlineLimit: 0 }
});
