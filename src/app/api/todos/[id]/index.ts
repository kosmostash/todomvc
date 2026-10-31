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
  }>(async (event) => {
    const { title, completed } = event.validated.json;
    const todo = updateTodo(event.validated.params.id, {
      ...(title === undefined ? {} : { title: title.trim() }),
      ...(completed === undefined ? {} : { completed }),
    });
    if (!todo) throw new HTTPError([404, "todo not found"]);
    return todo;
  }),

  // destroy a todo
  DELETE(async (event) => {
    if (!deleteTodo(event.validated.params.id)) {
      throw new HTTPError([404, "todo not found"]);
    }
    return new Response(null, { status: 204 });
  }),
]);
