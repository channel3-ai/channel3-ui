import { defineConfig } from "vitest/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["registry/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      "@": root,
    },
  },
});
