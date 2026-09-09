import { defineConfig } from "@kosmojs/dev";

export default defineConfig({
  frontend: {
    stack: "react",
    base: "/",
    fetch: true,
    ssr: true,
    ssg: false,
    tanstack: { query: false },
  },
  backend: {
    stack: "hono",
    base: "/api",
    openapi: {
      outfile: "openapi.json",
      openapi: "3.1.0",
      info: {
        title: "TodoMVC API",
        version: "1.0.0",
        summary: "The TodoMVC backend - todos persisted in SQLite",
        license: { name: "MIT" },
      },
      servers: [{ url: "http://localhost:4556/api", description: "Development server" }],
    },
  },
  validation: true,
});
