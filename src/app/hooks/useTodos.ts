import { useCallback, useEffect, useRef, useState } from "react";

import fetchClients, { ValidationError, type ResponseT } from "_/fetch";

const collection = fetchClients["todos"];
const item = fetchClients["todos/[id]"];

/**
 * The client's view of a todo, named once from the API contract.
 * Change the route's `response` type and every consumer here moves with it.
 */
export type TodoT = ResponseT["todos"]["GET"][number];

export type TodoFilterT = "all" | "active" | "completed";

export const filterTodos = (todos: Array<TodoT>, filter: TodoFilterT): Array<TodoT> => {
  switch (filter) {
    case "active":
      return todos.filter(({ completed }) => !completed);
    case "completed":
      return todos.filter(({ completed }) => completed);
    default:
      return todos;
  }
};

/** Fetch clients always throw - turn whatever came back into something displayable. */
const describe = (error: unknown): string => {
  // client-side validation failed, so no request was made
  if (error instanceof ValidationError) {
    return error.errorMessage;
  }

  // an HTTP error carries the parsed body of our api/errors.ts response
  const body = (error as { body?: { error?: string } })?.body;

  if (body?.error) {
    return body.error;
  }

  return error instanceof Error ? error.message : String(error);
};

/**
 * Todo state plus the mutations behind it.
 *
 * The list arrives already resolved from the route loader (in-process during
 * SSR, over the network on the client), so this starts from real data.
 *
 * Every mutation paints its result immediately and folds the server's answer in
 * when it lands; if the request fails, the list goes back to what the server
 * last confirmed and the error is surfaced rather than swallowed.
 */
export const useTodos = (initial: Array<TodoT>) => {
  const [todos, setTodos] = useState(initial);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(0);

  // the last committed list, which is what an optimistic update rolls back to
  const committed = useRef(todos);

  useEffect(() => {
    committed.current = todos;
  }, [todos]);

  const mutate = useCallback(
    async (
      optimistic: (current: Array<TodoT>) => Array<TodoT>,
      request: () => Promise<void>,
    ): Promise<void> => {
      const snapshot = committed.current;

      setTodos(optimistic);
      setPending((count) => count + 1);

      try {
        await request();
        setError(undefined);
      } catch (failure) {
        setTodos(snapshot);
        setError(describe(failure));
      } finally {
        setPending((count) => count - 1);
      }
    },
    [],
  );

  const replace = (updated: TodoT) => {
    setTodos((current) => current.map((todo) => (todo.id === updated.id ? updated : todo)));
  };

  const patch = (id: number, fields: Partial<TodoT>) => (current: Array<TodoT>) => {
    return current.map((todo) => (todo.id === id ? { ...todo, ...fields } : todo));
  };

  return {
    todos,
    error,
    busy: pending > 0,

    dismissError: () => setError(undefined),

    // nothing to paint until the server assigns an id
    add: (title: string) =>
      mutate(
        (current) => current,
        async () => {
          const created = await collection.POST([], { json: { title } });
          setTodos((current) => [...current, created]);
        },
      ),

    setCompleted: (id: number, completed: boolean) =>
      mutate(patch(id, { completed }), async () => {
        replace(await item.PATCH([id], { json: { completed } }));
      }),

    rename: (id: number, title: string) =>
      mutate(patch(id, { title }), async () => {
        replace(await item.PATCH([id], { json: { title } }));
      }),

    destroy: (id: number) =>
      mutate(
        (current) => current.filter((todo) => todo.id !== id),
        async () => {
          await item.DELETE([id]);
        },
      ),

    setAllCompleted: (completed: boolean) =>
      mutate(
        (current) => current.map((todo) => ({ ...todo, completed })),
        async () => setTodos(await collection.PATCH([], { json: { completed } })),
      ),

    clearCompleted: () =>
      mutate(
        (current) => current.filter(({ completed }) => !completed),
        async () => setTodos(await collection.DELETE([], { query: { completed: true } })),
      ),
  };
};
