import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    // Spinning up PGlite (an in-process WASM Postgres) and applying the full
    // migration is CPU-heavy. When test files run in parallel under load the
    // default 5s hook/test budget is too tight and the DB-setup hooks flake, so
    // give the real-Postgres suite generous, explicit headroom.
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
