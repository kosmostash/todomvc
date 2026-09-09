import type { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { openDatabase } from "./index";
import { createTodoStore, type TodoStore } from "./todos";

describe("todo store", () => {
  let connection: DatabaseSync;
  let todos: TodoStore;

  beforeEach(() => {
    connection = openDatabase(":memory:");
    todos = createTodoStore(() => connection);
  });

  afterEach(() => {
    connection.close();
  });

  it("starts empty", () => {
    expect(todos.list()).toEqual([]);
  });

  it("creates todos as active, oldest first", () => {
    const first = todos.create("Taste JavaScript");
    const second = todos.create("Buy a unicorn");

    expect(first).toEqual({ id: first.id, title: "Taste JavaScript", completed: false });
    expect(todos.list().map(({ title }) => title)).toEqual([
      "Taste JavaScript",
      "Buy a unicorn",
    ]);
    expect(second.id).toBeGreaterThan(first.id);
  });

  it("updates title and completed independently", () => {
    const todo = todos.create("Taste JavaScript");

    expect(todos.update(todo.id, { completed: true })).toEqual({
      ...todo,
      completed: true,
    });
    expect(todos.update(todo.id, { title: "Taste TypeScript" })).toEqual({
      ...todo,
      title: "Taste TypeScript",
      completed: true,
    });
  });

  it("bumps updated_at on update", () => {
    const todo = todos.create("Taste JavaScript");
    const updatedAt = () =>
      connection.prepare("SELECT updated_at FROM todos WHERE id = ?").get(todo.id) as {
        updated_at: number;
      };

    const before = updatedAt().updated_at;
    connection.prepare("UPDATE todos SET updated_at = 0 WHERE id = ?").run(todo.id);
    todos.update(todo.id, { completed: true });

    expect(updatedAt().updated_at).toBeGreaterThanOrEqual(before);
  });

  it("reports a missing todo instead of throwing", () => {
    expect(todos.find(404)).toBeUndefined();
    expect(todos.update(404, { completed: true })).toBeUndefined();
    expect(todos.remove(404)).toBeUndefined();
  });

  it("removes a todo once, returning what it removed", () => {
    const todo = todos.create("Taste JavaScript");

    expect(todos.remove(todo.id)).toEqual(todo);
    expect(todos.remove(todo.id)).toBeUndefined();
    expect(todos.list()).toEqual([]);
  });

  it("toggles all todos and counts only the rows it changed", () => {
    todos.create("Taste JavaScript");
    const second = todos.create("Buy a unicorn");
    todos.update(second.id, { completed: true });

    expect(todos.setAllCompleted(true)).toBe(1);
    expect(todos.setAllCompleted(true)).toBe(0);
    expect(todos.list().every(({ completed }) => completed)).toBe(true);

    expect(todos.setAllCompleted(false)).toBe(2);
    expect(todos.list().some(({ completed }) => completed)).toBe(false);
  });

  it("removes todos by completed state", () => {
    const first = todos.create("Taste JavaScript");
    todos.create("Buy a unicorn");
    todos.update(first.id, { completed: true });

    expect(todos.removeByCompleted(true)).toBe(1);
    expect(todos.list().map(({ title }) => title)).toEqual(["Buy a unicorn"]);
  });

  it("rejects a completed value outside 0/1", () => {
    expect(() =>
      connection.prepare("INSERT INTO todos (title, completed) VALUES (?, ?)").run("x", 2),
    ).toThrow();
  });
});
