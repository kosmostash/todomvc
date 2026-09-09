import { type KeyboardEvent, useState } from "react";

import type { LinkProps } from "_/core";

import Link from "~/components/Link";
import TodoItem from "~/components/TodoItem";
import { filterTodos, useTodos, type TodoFilterT, type TodoT } from "~/hooks/useTodos";

const FILTERS: Array<{ label: string; filter: TodoFilterT; to: LinkProps }> = [
  { label: "All", filter: "all", to: ["index"] },
  { label: "Active", filter: "active", to: ["active"] },
  { label: "Completed", filter: "completed", to: ["completed"] },
];

/**
 * The TodoMVC application.
 *
 * Every filter route renders this with the list its loader resolved; the filter
 * itself comes from the route, so the three URLs are real pages rather than
 * client-side state.
 */
export default function TodoApp(props: { filter: TodoFilterT; todos: Array<TodoT> }) {
  const {
    todos,
    error,
    busy,
    dismissError,
    add,
    setCompleted,
    rename,
    destroy,
    setAllCompleted,
    clearCompleted,
  } = useTodos(props.todos);

  const [draft, setDraft] = useState("");

  const visible = filterTodos(todos, props.filter);
  const remaining = todos.filter(({ completed }) => !completed).length;
  const completedCount = todos.length - remaining;

  const addTodo = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") {
      return;
    }

    const title = draft.trim();

    if (title) {
      setDraft("");
      add(title);
    }
  };

  return (
    <section className="todoapp" aria-busy={busy}>
      <header className="header">
        <h1>todos</h1>
        {/* no <form>: a native submit before hydration would navigate away and
            lose the todo. Enter is the spec's gesture and it needs no form. */}
        <input
          className="new-todo"
          placeholder="What needs to be done?"
          aria-label="New todo"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={addTodo}
          autoFocus
        />
      </header>

      {todos.length > 0 && (
        <>
          <section className="main">
            <input
              id="toggle-all"
              className="toggle-all"
              type="checkbox"
              checked={remaining === 0}
              onChange={(event) => setAllCompleted(event.target.checked)}
            />
            <label htmlFor="toggle-all">Mark all as complete</label>

            <ul className="todo-list">
              {visible.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  onToggle={(completed) => setCompleted(todo.id, completed)}
                  onRename={(title) => rename(todo.id, title)}
                  onDestroy={() => destroy(todo.id)}
                />
              ))}
            </ul>
          </section>

          <footer className="footer">
            <span className="todo-count">
              <strong>{remaining}</strong> {remaining === 1 ? "item" : "items"} left
            </span>

            <ul className="filters">
              {FILTERS.map(({ label, filter, to }) => (
                <li key={filter}>
                  {/* typed navigation: rename a page folder and every `to` stops compiling */}
                  <Link
                    to={to}
                    className={filter === props.filter ? "selected" : undefined}
                    aria-current={filter === props.filter ? "page" : undefined}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {completedCount > 0 && (
              <button className="clear-completed" type="button" onClick={clearCompleted}>
                Clear completed
              </button>
            )}
          </footer>
        </>
      )}

      {error && (
        <p className="todo-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={dismissError} aria-label="Dismiss error">
            ✕
          </button>
        </p>
      )}
    </section>
  );
}
