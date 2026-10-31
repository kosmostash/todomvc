import { defineConfig, mergeConfig } from "vitest/config";

import { loadConfig } from "@kosmojs/vitest";

// keep test data away from the dev database;
// set here so both the harness dev server and test workers pick it up
process.env.TODOS_DB ??= "var/test.sqlite";

export default defineConfig(
  mergeConfig(
    {
      test: {
        // api and page tests share one sqlite file, run them one at a time
        fileParallelism: false,
      },
    },
    await loadConfig(import.meta.dirname),
  ),
);
