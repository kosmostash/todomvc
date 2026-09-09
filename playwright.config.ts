import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT || 4599);

/**
 * The end-to-end suite runs against the production build - `dist/run.js`, the
 * same entry point production starts - because that is the only place server
 * rendering actually happens. The dev server is always client-rendered.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `pnpm build && node dist/run.js -p ${port}`,
    url: `http://localhost:${port}/api/todos`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { TODOMVC_DB: "data/e2e-todos.db" },
  },
});
