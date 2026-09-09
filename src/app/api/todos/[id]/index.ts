import { HTTPError } from "@kosmojs/core/errors";

import { todos } from "@/db/todos";
import type { TodoPatch } from "@/db/todos";

import { defineRoute } from "_/api";

import { normalizeTitle } from "../title";
import type { TodoIdT, TodoPatchT, TodoT } from "../types";

/**
 * A single todo - `/api/todos/:id`.
 *
 * The params tuple refines `[id]` into a positive integer, so `/api/todos/1.5`
 * and `/api/todos/abc` are rejected with a 400 before the handler runs.
 */
export default defineRoute<"todos/[id]", [
  TodoIdT,
]>(({ PATCH, DELETE }) => [
  PATCH<{
    json: TodoPatchT,
    response: [200, "json", TodoT],
  }>(async (ctx) => {
    const { id } = ctx.validated.params;
    const { title, completed } = ctx.validated.json;

    const patch: TodoPatch = {
      ...(title === undefined ? {} : { title: normalizeTitle(title) }),
      ...(completed === undefined ? {} : { completed }),
    };

    const todo = todos.update(id, patch);

    if (!todo) {
      throw new HTTPError([404, `No todo with id ${id}`]);
    }

    return ctx.json(todo);
  }),

  // answers with the removed todo rather than a bodyless 204,
  // so the fetch client has something typed to hand back
  DELETE<{
    response: [200, "json", TodoT],
  }>(async (ctx) => {
    const { id } = ctx.validated.params;
    const removed = todos.remove(id);

    if (!removed) {
      throw new HTTPError([404, `No todo with id ${id}`]);
    }

    return ctx.json(removed);
  }),
]);
