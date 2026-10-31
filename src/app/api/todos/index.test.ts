import { beforeEach, describe, expect, test } from "vitest";

import { prepareHarness } from "_/test/api";

const { client, route } = await prepareHarness("todos");

const reset = async () => {
  await client.PATCH([], { json: { completed: true } });
  await client.DELETE([]);
};

describe(route, () => {
  beforeEach(reset);

  test("GET lists todos in creation order", async () => {
    await client.POST([], { json: { title: "a" } });
    await client.POST([], { json: { title: "b" } });

    const { body, response } = await client.GET([]);
    expect(response.status).toBe(200);
    expect(body).toMatchObject([
      { title: "a", completed: false },
      { title: "b", completed: false },
    ]);
  });

  test("POST creates a trimmed todo", async () => {
    const { body, response } = await client.POST([], {
      json: { title: "  buy milk  " },
    });
    expect(response.status).toBe(201);
    expect(body).toMatchObject({ title: "buy milk", completed: false });
  });

  test("POST rejects blank titles", async () => {
    const { response } = await client.POST([], { json: { title: "   " } });
    expect(response.status).toBe(400);

    const { body } = await client.GET([]);
    expect(body).toEqual([]);
  });

  test("PATCH marks all todos complete / incomplete", async () => {
    await client.POST([], { json: { title: "a" } });
    await client.POST([], { json: { title: "b" } });

    let { body } = await client.PATCH([], { json: { completed: true } });
    expect(body).toMatchObject([{ completed: true }, { completed: true }]);

    ({ body } = await client.PATCH([], { json: { completed: false } }));
    expect(body).toMatchObject([{ completed: false }, { completed: false }]);
  });

  test("DELETE clears completed todos only", async () => {
    await client.POST([], { json: { title: "a" } });
    await client.POST([], { json: { title: "b" } });
    await client.PATCH([], { json: { completed: true } });
    await client.POST([], { json: { title: "c" } });

    const { body } = await client.DELETE([]);
    expect(body).toMatchObject([{ title: "c", completed: false }]);
  });
});
