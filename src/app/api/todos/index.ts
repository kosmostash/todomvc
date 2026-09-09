import { todos } from "@/db/todos";

import { defineRoute } from "_/api";

import { normalizeTitle } from "./title";
import type { NewTodoT, TodoT, ToggleAllT } from "./types";

/**
 * The todo collection - `/api/todos`.
 *
 * The two collection-wide mutations answer with the resulting list, so a client
 * that toggles or clears everything is back in sync in a single round trip.
 */
export default defineRoute<"todos">(({ GET, POST, PATCH, DELETE }) => [
  GET<{
    response: [200, "json", Array<TodoT>],
  }>(async (ctx) => {
    return ctx.json(todos.list());
  }),

  POST<{
    json: NewTodoT,
    response: [201, "json", TodoT],
  }>(async (ctx) => {
    const title = normalizeTitle(ctx.validated.json.title);
    return ctx.json(todos.create(title), 201);
  }),

  // mark every todo complete / incomplete
  PATCH<{
    json: ToggleAllT,
    response: [200, "json", Array<TodoT>],
  }>(async (ctx) => {
    todos.setAllCompleted(ctx.validated.json.completed);
    return ctx.json(todos.list());
  }),

  // `?completed=true` clears completed todos - the query target coerces the boolean
  DELETE<{
    query: { completed: boolean },
    response: [200, "json", Array<TodoT>],
  }>(async (ctx) => {
    todos.removeByCompleted(ctx.validated.query.completed);
    return ctx.json(todos.list());
  }),
]);
