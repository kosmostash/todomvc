<script module lang="ts">
  import fetchClients from "_/fetch";

  const todosApi = fetchClients["todos"];

  // module-level export, so it lives in the module <script> block;
  // runs on the server during SSR (in-process API call)
  export const loader = () => todosApi.GET([]);
</script>

<script lang="ts">
  import { useLoaderData, useParams } from "_/use";
  import Link from "~/components/Link.svelte";
  import TodoItem from "~/components/TodoItem.svelte";
  import NotFound from "~/pages/404.svelte";
  import type { Todo } from "~/types/todo";

  const todoApi = fetchClients["todos/[id]"];

  const FILTERS = ["active", "completed"] as const;
  type Filter = (typeof FILTERS)[number];

  const isFilter = (value: unknown): value is Filter =>
    FILTERS.includes(value as Filter);

  // every filter link is a full page load, so params and data are read once
  const { filter } = useParams<"{filter}">();
  const validFilter = filter === undefined || isFilter(filter);

  // local, optimistically updated copy of the loaded todos
  let todos = $state<Array<Todo>>(useLoaderData<Array<Todo>>() ?? []);
  let newTodo = $state("");

  // UI is updated optimistically; on failure, log and resync with the server
  const reportError = (error: unknown) => {
    console.error(error);
    todosApi.GET([]).then((list) => (todos = list), console.error);
  };

  const setTodos = (list: Array<Todo>) => {
    todos = list;
  };

  const replaceTodo = (todo: Todo) => {
    todos = todos.map((t) => (t.id === todo.id ? todo : t));
  };

  const onNewTodoKeyDown = async (event: KeyboardEvent) => {
    if (event.key !== "Enter") return;
    // ignore Enter while an IME composition is in progress
    if (event.isComposing) return;
    const title = newTodo.trim();
    if (!title) return;
    newTodo = "";
    try {
      const todo = await todosApi.POST([], { json: { title } });
      todos = [...todos, todo];
    } catch (error) {
      reportError(error);
    }
  };

  const toggleAll = (completed: boolean) => {
    todos = todos.map((t) => ({ ...t, completed }));
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
    todos = todos.filter((t) => t.id !== todo.id);
    todoApi.DELETE([todo.id]).catch(reportError);
  };

  const clearCompleted = () => {
    todos = todos.filter((t) => !t.completed);
    todosApi.DELETE([]).then(setTodos, reportError);
  };

  const activeCount = $derived(todos.filter((t) => !t.completed).length);
  const completedCount = $derived(todos.length - activeCount);

  const visibleTodos = $derived(
    todos.filter((todo) =>
      filter === "active"
        ? !todo.completed
        : filter === "completed"
          ? todo.completed
          : true,
    ),
  );
</script>

{#if !validFilter}
  <NotFound />
{:else}
  <section class="todoapp">
    <header class="header">
      <h1>todos</h1>
      <!-- svelte-ignore a11y_autofocus -->
      <input
        bind:value={newTodo}
        class="new-todo"
        placeholder="What needs to be done?"
        autofocus
        onkeydown={onNewTodoKeyDown}
      />
    </header>

    {#if todos.length}
      <section class="main">
        <input
          id="toggle-all"
          class="toggle-all"
          type="checkbox"
          checked={activeCount === 0}
          onchange={(event) => toggleAll(event.currentTarget.checked)}
        />
        <label for="toggle-all">Mark all as complete</label>
        <ul class="todo-list">
          {#each visibleTodos as todo (todo.id)}
            <TodoItem {todo} onToggle={toggle} onSave={save} onDestroy={destroy} />
          {/each}
        </ul>
      </section>

      <footer class="footer">
        <span class="todo-count">
          <strong>{activeCount}</strong>
          {activeCount === 1 ? "item" : "items"} left
        </span>
        <ul class="filters">
          <li>
            <Link to={["{filter}"]} class={filter === undefined ? "selected" : undefined}>All</Link>
          </li>
          <li>
            <Link to={["{filter}", "active"]} class={filter === "active" ? "selected" : undefined}>Active</Link>
          </li>
          <li>
            <Link to={["{filter}", "completed"]} class={filter === "completed" ? "selected" : undefined}>Completed</Link>
          </li>
        </ul>
        {#if completedCount}
          <button class="clear-completed" onclick={clearCompleted}>Clear completed</button>
        {/if}
      </footer>
    {/if}
  </section>

  <footer class="info">
    <p>Double-click to edit a todo</p>
    <p>Created with <a href="https://kosmojs.dev">KosmoJS</a> (Svelte + Hono)</p>
    <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>
  </footer>
{/if}
