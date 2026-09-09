import type { DatabaseSync } from "node:sqlite";

import { db } from "./index";

export type TodoRecord = {
  id: number;
  title: string;
  completed: boolean;
};

export type TodoPatch = {
  title?: string;
  completed?: boolean;
};

export type TodoStore = {
  /** Every todo, oldest first. */
  list(): Array<TodoRecord>;
  find(id: number): TodoRecord | undefined;
  create(title: string): TodoRecord;
  /** Applies the patch and returns the stored todo, or `undefined` if there is no such id. */
  update(id: number, patch: TodoPatch): TodoRecord | undefined;
  /** Removes a todo and returns it, or `undefined` if there is no such id. */
  remove(id: number): TodoRecord | undefined;
  /** Marks every todo complete/incomplete. Returns how many rows changed. */
  setAllCompleted(completed: boolean): number;
  /** Removes every completed (or every active) todo. Returns how many rows were removed. */
  removeByCompleted(completed: boolean): number;
};

type TodoRow = {
  id: number;
  title: string;
  completed: number;
};

const SELECT_COLUMNS = "id, title, completed";
const NOW = "unixepoch('subsec') * 1000";

const toRecord = (row: TodoRow): TodoRecord => ({
  id: row.id,
  title: row.title,
  completed: row.completed === 1,
});

/**
 * Builds a store over a connection resolver rather than a connection.
 *
 * The dev server restarts the API on every change and `closeDatabase` drops the
 * handle, so resolving per call is what keeps a store from outliving its connection.
 * Tests pass their own resolver - see `db/todos.test.ts`.
 */
export const createTodoStore = (connection: () => DatabaseSync): TodoStore => ({
  list() {
    const rows = connection()
      .prepare(`SELECT ${SELECT_COLUMNS} FROM todos ORDER BY id`)
      .all() as Array<TodoRow>;

    return rows.map(toRecord);
  },

  find(id) {
    const row = connection()
      .prepare(`SELECT ${SELECT_COLUMNS} FROM todos WHERE id = ?`)
      .get(id) as TodoRow | undefined;

    return row && toRecord(row);
  },

  create(title) {
    const row = connection()
      .prepare(`INSERT INTO todos (title) VALUES (?) RETURNING ${SELECT_COLUMNS}`)
      .get(title) as TodoRow;

    return toRecord(row);
  },

  update(id, patch) {
    const assignments: Array<string> = [];
    const values: Array<string | number> = [];

    if (patch.title !== undefined) {
      assignments.push("title = ?");
      values.push(patch.title);
    }

    if (patch.completed !== undefined) {
      assignments.push("completed = ?");
      values.push(patch.completed ? 1 : 0);
    }

    if (!assignments.length) {
      return this.find(id);
    }

    const row = connection()
      .prepare(
        `UPDATE todos SET ${assignments.join(", ")}, updated_at = ${NOW}
         WHERE id = ? RETURNING ${SELECT_COLUMNS}`,
      )
      .get(...values, id) as TodoRow | undefined;

    return row && toRecord(row);
  },

  remove(id) {
    const row = connection()
      .prepare(`DELETE FROM todos WHERE id = ? RETURNING ${SELECT_COLUMNS}`)
      .get(id) as TodoRow | undefined;

    return row && toRecord(row);
  },

  setAllCompleted(completed) {
    const { changes } = connection()
      .prepare(
        `UPDATE todos SET completed = ?, updated_at = ${NOW} WHERE completed != ?`,
      )
      .run(completed ? 1 : 0, completed ? 1 : 0);

    return Number(changes);
  },

  removeByCompleted(completed) {
    const { changes } = connection()
      .prepare("DELETE FROM todos WHERE completed = ?")
      .run(completed ? 1 : 0);

    return Number(changes);
  },
});

/** The store every source folder talks to. */
export const todos = createTodoStore(db);
