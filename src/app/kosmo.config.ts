import { defineConfig } from "@kosmojs/dev";

export default defineConfig({
  frontend: {
    stack: "vue",
    base: "/",
    ssr: true,
    ssg: false,
    tanstack: { query: false },
    // serve the production SSR build in the test harness,
    // so tests can assert on server-rendered HTML
    test: { seed: true, ssr: true },
  },
  backend: {
    stack: "koa",
    base: "/api",
    test: true,
  },
  fetch: true,
  validation: true,
  typecheck: true,
});
