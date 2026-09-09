import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * The project's database layer.
 *
 * It lives at the project root rather than inside a source folder because it is
 * not owned by any of them - every source folder reaches it through `@/db`.
 */

const MIGRATION = `
  CREATE TABLE IF NOT EXISTS todos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    completed  INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
    created_at INTEGER NOT NULL DEFAULT (unixepoch('subsec') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch('subsec') * 1000)
  );

  CREATE INDEX IF NOT EXISTS todos_completed_idx ON todos (completed);
`;

/** Absolute path of the database file, or `:memory:` for an ephemeral one. */
export const databaseFile = (): string => {
  const configured = process.env.TODOMVC_DB?.trim();

  if (configured === ":memory:") {
    return configured;
  }

  return resolve(process.cwd(), configured || "data/todos.db");
};

export const openDatabase = (file = databaseFile()): DatabaseSync => {
  if (file !== ":memory:") {
    mkdirSync(dirname(file), { recursive: true });
  }

  const db = new DatabaseSync(file);

  // WAL keeps readers from blocking the writer; both pragmas are per-connection.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(MIGRATION);

  return db;
};

let connection: DatabaseSync | undefined;

/**
 * The process-wide connection, opened on first use.
 *
 * The dev server hot-reloads the API by restarting the program, so this is
 * re-created on every reload - `closeDatabase` in `api/dev.ts` is what keeps
 * the previous handle from leaking.
 */
export const db = (): DatabaseSync => {
  connection ??= openDatabase();
  return connection;
};

export const closeDatabase = (): void => {
  connection?.close();
  connection = undefined;
};
