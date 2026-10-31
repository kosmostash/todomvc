import { createEffect, createSignal, Show } from "solid-js";

import type { Todo } from "~/types/todo";

export default function TodoItem(props: {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onSave: (todo: Todo, title: string) => void;
  onDestroy: (todo: Todo) => void;
}) {
  const [editing, setEditing] = createSignal(false);
  const [editText, setEditText] = createSignal("");
  let input: HTMLInputElement | undefined;

  createEffect(() => {
    if (editing()) input?.focus();
  });

  const startEditing = () => {
    setEditText(props.todo.title);
    setEditing(true);
  };

  const submit = () => {
    if (!editing()) return;
    setEditing(false);
    const title = editText().trim();
    if (!title) {
      props.onDestroy(props.todo);
    } else if (title !== props.todo.title) {
      props.onSave(props.todo, title);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      submit();
    } else if (event.key === "Escape") {
      setEditing(false);
    }
  };

  return (
    <li
      class={[props.todo.completed && "completed", editing() && "editing"]
        .filter(Boolean)
        .join(" ")}
      data-testid="todo-item"
    >
      <div class="view">
        <input
          class="toggle"
          type="checkbox"
          checked={props.todo.completed}
          onChange={() => props.onToggle(props.todo)}
        />
        <label onDblClick={startEditing}>{props.todo.title}</label>
        <button class="destroy" onClick={() => props.onDestroy(props.todo)} />
      </div>
      <Show when={editing()}>
        <input
          ref={input}
          class="edit"
          value={editText()}
          onInput={(event) => setEditText(event.currentTarget.value)}
          onBlur={submit}
          onKeyDown={onKeyDown}
        />
      </Show>
    </li>
  );
}
