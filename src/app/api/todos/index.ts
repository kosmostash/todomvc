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
  }>(async (ctx) => {
    ctx.body = listTodos();
  }),

  // create a todo
  POST<{
    json: { title: VRefine<string, { pattern: "\\S" }> };
    response: [201, "json", Todo];
  }>(async (ctx) => {
    const title = ctx.validated.json.title.trim();
    if (!title) throw new HTTPError([400, "title must not be empty"]);
    ctx.status = 201;
    ctx.body = createTodo(title);
  }),

  // mark all todos as complete / incomplete
  PATCH<{
    json: { completed: boolean };
    response: [200, "json", Array<Todo>];
  }>(async (ctx) => {
    ctx.body = setAllCompleted(ctx.validated.json.completed);
  }),

  // clear completed todos
  DELETE<{
    response: [200, "json", Array<Todo>];
  }>(async (ctx) => {
    ctx.body = clearCompleted();
  }),
]);
