import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { Todo } from "~/types/todo";

type TodoRow = { id: number; title: string; completed: number };

const toTodo = ({ id, title, completed }: TodoRow): Todo => ({
  id,
  title,
  completed: completed === 1,
});

let db: DatabaseSync | undefined;

const connect = (): DatabaseSync => {
  if (!db) {
    const file = resolve(process.env.TODOS_DB || "var/todos.sqlite");
    mkdirSync(dirname(file), { recursive: true });
    db = new DatabaseSync(file);
    db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0
      );
    `);
  }
  return db;
};

export const closeDb = () => {
  db?.close();
  db = undefined;
};

export const listTodos = (): Array<Todo> =>
  (connect().prepare("SELECT * FROM todos ORDER BY id").all() as Array<TodoRow>).map(toTodo);

export const getTodo = (id: number): Todo | undefined => {
  const row = connect().prepare("SELECT * FROM todos WHERE id = ?").get(id) as TodoRow | undefined;
  return row ? toTodo(row) : undefined;
};

export const createTodo = (title: string): Todo => {
  const row = connect()
    .prepare("INSERT INTO todos (title) VALUES (?) RETURNING *")
    .get(title) as TodoRow;
  return toTodo(row);
};

export const updateTodo = (
  id: number,
  patch: { title?: string; completed?: boolean },
): Todo | undefined => {
  const current = getTodo(id);
  if (!current) return undefined;
  const row = connect()
    .prepare("UPDATE todos SET title = ?, completed = ? WHERE id = ? RETURNING *")
    .get(
      patch.title ?? current.title,
      (patch.completed ?? current.completed) ? 1 : 0,
      id,
    ) as TodoRow;
  return toTodo(row);
};

export const deleteTodo = (id: number): boolean =>
  Number(connect().prepare("DELETE FROM todos WHERE id = ?").run(id).changes) > 0;

export const setAllCompleted = (completed: boolean): Array<Todo> => {
  connect().prepare("UPDATE todos SET completed = ?").run(completed ? 1 : 0);
  return listTodos();
};

export const clearCompleted = (): Array<Todo> => {
  connect().prepare("DELETE FROM todos WHERE completed = 1").run();
  return listTodos();
};
