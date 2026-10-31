import { HTTPError } from "@kosmojs/core/errors";

import { defineRoute } from "_/api";
import {
  clearCompleted,
  createTodo,
  listTodos,
  setAllCompleted,
} from "~/lib/db";
import type { Todo } from "~/types/todo";

export default defineRoute<"todos">(({ GET, POST, PATCH, DELETE }) => [
  // list all todos
  GET<{
    response: [200, "json", Array<Todo>];
  }>(async () => {
    return listTodos();
  }),

  // create a todo
  POST<{
    json: { title: VRefine<string, { pattern: "\\S" }> };
    response: [201, "json", Todo];
  }>(async (event) => {
    const title = event.validated.json.title.trim();
    if (!title) throw new HTTPError([400, "title must not be empty"]);
    event.res.status = 201;
    return createTodo(title);
  }),

  // mark all todos as complete / incomplete
  PATCH<{
    json: { completed: boolean };
    response: [200, "json", Array<Todo>];
  }>(async (event) => {
    return setAllCompleted(event.validated.json.completed);
  }),

  // clear completed todos
  DELETE<{
    response: [200, "json", Array<Todo>];
  }>(async () => {
    return clearCompleted();
  }),
]);
