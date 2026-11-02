<script lang="ts">
import fetchClients from "_/fetch";

const todosApi = fetchClients["todos"];

// module-level export, so it lives in a plain <script> block;
// runs on the server during SSR (in-process API call),
// and on the client before navigating
export const loader = () => todosApi.GET([]);
</script>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";

import { useLoaderData } from "_/use";
import Link from "~/components/Link.vue";
import TodoItem from "~/components/TodoItem.vue";
import NotFound from "~/pages/404.vue";
import type { Todo } from "~/types/todo";

const todoApi = fetchClients["todos/[id]"];

const FILTERS = ["active", "completed"] as const;
type Filter = (typeof FILTERS)[number];

const isFilter = (value: unknown): value is Filter =>
  FILTERS.includes(value as Filter);

const route = useRoute();

const filter = computed(() => route.params.filter as string | undefined);
const validFilter = computed(
  () => filter.value === undefined || filter.value === "" || isFilter(filter.value),
);

// local, optimistically updated copy of the loaded todos
const todos = ref<Array<Todo>>(useLoaderData<Array<Todo>>() ?? []);
const newTodo = ref("");

// UI is updated optimistically; on failure, log and resync with the server
const reportError = (error: unknown) => {
  console.error(error);
  todosApi.GET([]).then((list) => (todos.value = list), console.error);
};

const setTodos = (list: Array<Todo>) => {
  todos.value = list;
};

const replaceTodo = (todo: Todo) => {
  todos.value = todos.value.map((t) => (t.id === todo.id ? todo : t));
};

const addTodo = async (event: KeyboardEvent) => {
  // ignore Enter while an IME composition is in progress
  if (event.isComposing) return;
  const title = newTodo.value.trim();
  if (!title) return;
  newTodo.value = "";
  try {
    const todo = await todosApi.POST([], { json: { title } });
    todos.value = [...todos.value, todo];
  } catch (error) {
    reportError(error);
  }
};

const toggleAll = (completed: boolean) => {
  todos.value = todos.value.map((t) => ({ ...t, completed }));
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
  todos.value = todos.value.filter((t) => t.id !== todo.id);
  todoApi.DELETE([todo.id]).catch(reportError);
};

const clearCompleted = () => {
  todos.value = todos.value.filter((t) => !t.completed);
  todosApi.DELETE([]).then(setTodos, reportError);
};

const activeCount = computed(() => todos.value.filter((t) => !t.completed).length);
const completedCount = computed(() => todos.value.length - activeCount.value);

const visibleTodos = computed(() =>
  todos.value.filter((todo) =>
    filter.value === "active"
      ? !todo.completed
      : filter.value === "completed"
        ? todo.completed
        : true,
  ),
);
</script>

<template>
  <NotFound v-if="!validFilter" />
  <template v-else>
    <section class="todoapp">
      <header class="header">
        <h1>todos</h1>
        <input
          v-model="newTodo"
          class="new-todo"
          placeholder="What needs to be done?"
          autofocus
          @keydown.enter="addTodo"
        />
      </header>

      <section v-if="todos.length" class="main">
        <input
          id="toggle-all"
          class="toggle-all"
          type="checkbox"
          :checked="activeCount === 0"
          @change="toggleAll(($event.target as HTMLInputElement).checked)"
        />
        <label for="toggle-all">Mark all as complete</label>
        <ul class="todo-list">
          <TodoItem
            v-for="todo in visibleTodos"
            :key="todo.id"
            :todo="todo"
            @toggle="toggle"
            @save="save"
            @destroy="destroy"
          />
        </ul>
      </section>

      <footer v-if="todos.length" class="footer">
        <span class="todo-count">
          <strong>{{ activeCount }}</strong>
          {{ activeCount === 1 ? "item" : "items" }} left
        </span>
        <ul class="filters">
          <li>
            <Link :to="['{filter}']" active-class="" exact-active-class="selected">All</Link>
          </li>
          <li>
            <Link :to="['{filter}', 'active']" active-class="" exact-active-class="selected">Active</Link>
          </li>
          <li>
            <Link :to="['{filter}', 'completed']" active-class="" exact-active-class="selected">Completed</Link>
          </li>
        </ul>
        <button v-if="completedCount" class="clear-completed" @click="clearCompleted">
          Clear completed
        </button>
      </footer>
    </section>

    <footer class="info">
      <p>Double-click to edit a todo</p>
      <p>Created with <a href="https://kosmojs.dev">KosmoJS</a> (Vue + H3)</p>
      <p>Part of <a href="http://todomvc.com">TodoMVC</a></p>
    </footer>
  </template>
</template>
