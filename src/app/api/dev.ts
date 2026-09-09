import { getRequestListener } from "@hono/node-server";

import { closeDatabase } from "@/db";

import app from "./app";

import { devSetup } from "_/api:factory";

export default devSetup({
  requestHandler() {
    return getRequestListener(app.fetch);
  },
  teardownHandler() {
    // the API restarts as a whole on every change - release the SQLite
    // handle here or the WAL files pile up across reloads
    closeDatabase();
  },
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 UNHANDLED REJECTION");
  console.error("Reason:", reason);
  process.exit(1);
});
