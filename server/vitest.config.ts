import { defineConfig } from "vitest/config";

// Tests live in server/tests and import server/src/... via relative paths.
// Run with `npm test` from inside server/ (or `npm test` from the repo
// root, which delegates here) — vitest picks this config up automatically
// since it sits next to package.json.
export default defineConfig({
  test: {
    include: ["tests/**/*.{test,spec}.ts"],
  },
});
