import {
  createMemo,
  createSignal,
  For,
  type Setter,
  Show,
  Suspense,
} from "solid-js";
import {
  createAsync,
  query,
  revalidate,
  useParams,
} from "@solidjs/router";

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

// query() gives preload and createAsync one shared cache entry
const getTodos = query(() => todosApi.GET([]), "todos");

// runs on the server during SSR (in-process API call),
// and on the client on navigation intent
export const preload = () => getTodos();

export default function TodoApp() {
  const params = useParams();

  return (
    // anything other than /, /active or /completed
    <Show
      when={params.filter === undefined || isFilter(params.filter)}
      fallback={<NotFound />}
    >
      {/* todos are read during render; SSR waits for them here */}
      <Suspense>
        <Todos filter={params.filter as Filter | undefined} />
      </Suspense>
    </Show>
  );
}

function Todos(props: { filter: Filter | undefined }) {
  const loaded = createAsync(() => getTodos());

  // local, optimistically updated copy of the loaded todos;
  // replaced whenever the loader delivers fresh data
  const state = createMemo(() => createSignal<Array<Todo>>(loaded() ?? []));
  const todos = () => state()[0]();
  const setTodos: Setter<Array<Todo>> = (value) => state()[1](value as never);

  const [newTodo, setNewTodo] = createSignal("");

  // UI is updated optimistically; on failure, log and resync with the server
  const reportError = (error: unknown) => {
    console.error(error);
    revalidate(getTodos.key);
  };

  const replaceTodo = (todo: Todo) => {
    setTodos((list) => list.map((t) => (t.id === todo.id ? todo : t)));
  };

  const onNewTodoKeyDown = async (event: KeyboardEvent) => {
    if (event.key !== "Enter") return;
    // ignore Enter while an IME composition is in progress
    if (event.isComposing) return;
    const title = newTodo().trim();
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

  const activeCount = () => todos().filter((todo) => !todo.completed).length;
  const completedCount = () => todos().length - activeCount();

  const visibleTodos = () =>
    todos().filter((todo) =>
      props.filter === "active"
        ? !todo.completed
        : props.filter === "completed"
          ? todo.completed
          : true,
    );

  return (
    <>
      <section class="todoapp">
        <header class="header">
          <h1>todos</h1>
          <input
            class="new-todo"
            placeholder="What needs to be done?"
            autofocus
            value={newTodo()}
            onInput={(event) => setNewTodo(event.currentTarget.value)}
            onKeyDown={onNewTodoKeyDown}
          />
        </header>

        <Show when={todos().length > 0}>
            <section class="main">
              <input
                id="toggle-all"
                class="toggle-all"
                type="checkbox"
                checked={activeCount() === 0}
                onChange={(event) => toggleAll(event.currentTarget.checked)}
              />
              <label for="toggle-all">Mark all as complete</label>
              <ul class="todo-list">
                <For each={visibleTodos()}>
                  {(todo) => (
                    <TodoItem
                      todo={todo}
                      onToggle={toggle}
                      onSave={save}
                      onDestroy={destroy}
                    />
                  )}
                </For>
              </ul>
            </section>

            <footer class="footer">
              <span class="todo-count">
                <strong>{activeCount()}</strong>{" "}
                {activeCount() === 1 ? "item" : "items"} left
              </span>
              <ul class="filters">
                <li>
                  <Link to={["{filter}"]} activeClass="selected" end>
                    All
                  </Link>
                </li>
                <li>
                  <Link to={["{filter}", "active"]} activeClass="selected" end>
                    Active
                  </Link>
                </li>
                <li>
                  <Link to={["{filter}", "completed"]} activeClass="selected" end>
                    Completed
                  </Link>
                </li>
              </ul>
              <Show when={completedCount() > 0}>
                <button class="clear-completed" onClick={clearCompleted}>
                  Clear completed
                </button>
              </Show>
            </footer>
        </Show>
      </section>

      <footer class="info">
        <p>Double-click to edit a todo</p>
        <p>
          Created with <a href="https://kosmojs.dev">KosmoJS</a> (SolidJS + H3)
        </p>
        <p>
          Part of <a href="http://todomvc.com">TodoMVC</a>
        </p>
      </footer>
    </>
  );
}
