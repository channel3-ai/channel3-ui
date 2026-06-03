import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

// Dev playground only. Consumers get component source via `shadcn add`
// (see registry.json); no built bundle is published to npm.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": root,
    },
  },
  server: {
    port: 5173,
  },
});
