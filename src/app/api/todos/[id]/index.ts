import { HTTPError } from "@kosmojs/core/errors";

import { defineRoute } from "_/api";
import { deleteTodo, updateTodo } from "~/lib/db";
import type { Todo } from "~/types/todo";

export default defineRoute<"todos/[id]", [
  VRefine<number, { minimum: 1 }>,
]>(({ PATCH, DELETE }) => [
  // update title and/or completed state
  PATCH<{
    json: {
      title?: VRefine<string, { pattern: "\\S" }>;
      completed?: boolean;
    };
    response: [200, "json", Todo];
  }>(async (ctx) => {
    const { title, completed } = ctx.validated.json;
    const todo = updateTodo(ctx.validated.params.id, {
      ...(title === undefined ? {} : { title: title.trim() }),
      ...(completed === undefined ? {} : { completed }),
    });
    if (!todo) throw new HTTPError([404, "todo not found"]);
    return ctx.json(todo);
  }),

  // destroy a todo
  DELETE(async (ctx) => {
    if (!deleteTodo(ctx.validated.params.id)) {
      throw new HTTPError([404, "todo not found"]);
    }
    return ctx.body(null, 204);
  }),
]);
