import { useLoaderData } from "react-router";

import fetchClients from "_/fetch";

import TodoApp from "~/components/TodoApp";
import type { TodoT } from "~/hooks/useTodos";

const { GET } = fetchClients["todos"];

export const loader = () => GET();

export default function CompletedTodosPage() {
  const todos = useLoaderData<Array<TodoT>>();
  return <TodoApp filter="completed" todos={todos} />;
}
