import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // e2e/ is Playwright's, and it brings its own runner
    include: ["db/**/*.test.ts"],
  },
});
