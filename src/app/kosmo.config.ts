import { defineConfig } from "@kosmojs/dev";

export default defineConfig({
  frontend: {
    stack: "react",
    base: "/",
    ssr: true,
    ssg: false,
    tanstack: { query: false },
    test: true,
  },
  backend: {
    stack: "hono",
    base: "/api",
    test: true,
  },
  fetch: true,
  validation: true,
  typecheck: true,
});
