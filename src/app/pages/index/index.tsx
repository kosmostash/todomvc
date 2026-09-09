import { useLoaderData } from "react-router";

import fetchClients from "_/fetch";

import TodoApp from "~/components/TodoApp";
import type { TodoT } from "~/hooks/useTodos";

const { GET } = fetchClients["todos"];

/**
 * React Router resolves this before the page renders.
 *
 * The same call takes two transports: during SSR it dispatches into the Hono
 * app in-process, in the browser it is a same-origin request.
 */
export const loader = () => GET();

export default function AllTodosPage() {
  const todos = useLoaderData<Array<TodoT>>();
  return <TodoApp filter="all" todos={todos} />;
}
