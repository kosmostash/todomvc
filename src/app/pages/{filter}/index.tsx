import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { useLoaderData, useParams, useRevalidator } from "react-router";

import fetchClients from "_/fetch";
import Link from "~/components/Link";
import TodoItem from "~/components/TodoItem";
import NotFound from "~/pages/404";
import type { Todo } from "~/types/todo";

const todosApi = fetchClients["todos"];
const todoApi = fetchClients["todos/[id]"];

const FILTERS = ["active", "completed"] as const;
type Filter = (typeof FILTERS)[number];

const isFilter = (value: unknown): value is Filter =>
  FILTERS.includes(value as Filter);

// runs on the server during SSR (in-process API call),
// and on the client when navigating between filters
export const loader = () => todosApi.GET([]);

export default function TodoApp() {
  const { filter } = useParams();

  // anything other than /, /active or /completed
  if (filter !== undefined && !isFilter(filter)) {
    return <NotFound />;
  }

  return <Todos filter={filter} />;
}

function Todos({ filter }: { filter: Filter | undefined }) {
  const loaded = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  const [todos, setTodos] = useState<Array<Todo>>(loaded);
  const [newTodo, setNewTodo] = useState("");

  // fresh loader data (e.g. after navigating to another filter) replaces local state
  useEffect(() => setTodos(loaded), [loaded]);

  // UI is updated optimistically; on failure, log and resync with the server
  const reportError = useCallback(
    (error: unknown) => {
      console.error(error);
      revalidator.revalidate();
    },
    [revalidator],
  );

  const replaceTodo = (todo: Todo) => {
    setTodos((list) => list.map((t) => (t.id === todo.id ? todo : t)));
  };

  const onNewTodoKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    // ignore Enter while an IME composition is in progress
    if (event.nativeEvent.isComposing) return;
    const title = newTodo.trim();
    if (!title) return;
    setNewTodo("");
    try {
      const todo = await todosApi.POST([], { json: { title } });
      setTodos((list) => [...list, todo]);
    } catch (error) {
      reportError(error);
    }
  };

  const toggleAll = (completed: boolean) => {
    setTodos((list) => list.map((t) => ({ ...t, completed })));
    todosApi.PATCH([], { json: { completed } }).then(setTodos, reportError);
  };

  const toggle = (todo: Todo) => {
    const completed = !todo.completed;
    replaceTodo({ ...todo, completed });
    todoApi
      .PATCH([todo.id], { json: { completed } })
      .then(replaceTodo, reportError);
  };

  const save = (todo: Todo, title: string) => {
    replaceTodo({ ...todo, title });
    todoApi.PATCH([todo.id], { json: { title } }).then(replaceTodo, reportError);
  };

  const destroy = (todo: Todo) => {
    setTodos((list) => list.filter((t) => t.id !== todo.id));
    todoApi.DELETE([todo.id]).catch(reportError);
  };

  const clearCompleted = () => {
    setTodos((list) => list.filter((t) => !t.completed));
    todosApi.DELETE([]).then(setTodos, reportError);
  };

  const activeCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.length - activeCount;

  const visibleTodos = todos.filter((todo) =>
    filter === "active"
      ? !todo.completed
      : filter === "completed"
        ? todo.completed
        : true,
  );

  const filterLinks: Array<[Filter | undefined, string]> = [
    [undefined, "All"],
    ["active", "Active"],
    ["completed", "Completed"],
  ];

  return (
    <>
      <section className="todoapp">
        <header className="header">
          <h1>todos</h1>
          <input
            className="new-todo"
            placeholder="What needs to be done?"
            autoFocus
            value={newTodo}
            onChange={(event) => setNewTodo(event.target.value)}
            onKeyDown={onNewTodoKeyDown}
          />
        </header>

        {todos.length > 0 && (
          <section className="main">
            <input
              id="toggle-all"
              className="toggle-all"
              type="checkbox"
              checked={activeCount === 0}
              onChange={(event) => toggleAll(event.target.checked)}
            />
            <label htmlFor="toggle-all">Mark all as complete</label>
            <ul className="todo-list">
              {visibleTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={toggle}
                  onSave={save}
                  onDestroy={destroy}
                />
              ))}
            </ul>
          </section>
        )}

        {todos.length > 0 && (
          <footer className="footer">
            <span className="todo-count">
              <strong>{activeCount}</strong>{" "}
              {activeCount === 1 ? "item" : "items"} left
            </span>
            <ul className="filters">
              {filterLinks.map(([name, label]) => (
                <li key={label}>
                  <Link
                    to={name ? ["{filter}", name] : ["{filter}"]}
                    className={filter === name ? "selected" : undefined}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            {completedCount > 0 && (
              <button className="clear-completed" onClick={clearCompleted}>
                Clear completed
              </button>
            )}
          </footer>
        )}
      </section>

      <footer className="info">
        <p>Double-click to edit a todo</p>
        <p>
          Created with <a href="https://kosmojs.dev">KosmoJS</a> (React + Hono)
        </p>
        <p>
          Part of <a href="http://todomvc.com">TodoMVC</a>
        </p>
      </footer>
    </>
  );
}
