import { toNodeHandler } from "h3/node";

import app from "./app";
import { closeDb } from "~/lib/db";

import { devSetup } from "_/api:factory";

export default devSetup({
  requestHandler() {
    return toNodeHandler(app);
  },
  teardownHandler() {
    closeDb();
  },
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 UNHANDLED REJECTION");
  console.error("Reason:", reason);
  process.exit(1);
});
