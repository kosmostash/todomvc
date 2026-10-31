import { beforeEach, describe, expect, test } from "vitest";

import { prepareHarness } from "_/test/api";

const { client, clients, route } = await prepareHarness("todos/[id]");
const todos = clients["todos"];

const create = async (title: string) => {
  const { body } = await todos.POST([], { json: { title } });
  if (body instanceof Error) throw body;
  return body;
};

describe(route, () => {
  beforeEach(async () => {
    await todos.PATCH([], { json: { completed: true } });
    await todos.DELETE([]);
  });

  test("PATCH toggles completed", async () => {
    const todo = await create("a");

    const { body, response } = await client.PATCH([todo.id], {
      json: { completed: true },
    });
    expect(response.status).toBe(200);
    expect(body).toEqual({ ...todo, completed: true });
  });

  test("PATCH updates a trimmed title", async () => {
    const todo = await create("a");

    const { body } = await client.PATCH([todo.id], {
      json: { title: "  b  " },
    });
    expect(body).toEqual({ ...todo, title: "b" });
  });

  test("PATCH responds 404 for a missing todo", async () => {
    const { response } = await client.PATCH([999_999], {
      json: { completed: true },
    });
    expect(response.status).toBe(404);
  });

  test("DELETE destroys a todo", async () => {
    const todo = await create("a");

    const { response } = await client.DELETE([todo.id]);
    expect(response.status).toBe(204);

    const { body } = await todos.GET([]);
    expect(body).toEqual([]);
  });

  test("DELETE responds 404 for a missing todo", async () => {
    const { response } = await client.DELETE([999_999]);
    expect(response.status).toBe(404);
  });
});
