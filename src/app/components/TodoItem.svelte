<script lang="ts">
  import type { Todo } from "~/types/todo";

  let {
    todo,
    onToggle,
    onSave,
    onDestroy,
  }: {
    todo: Todo;
    onToggle: (todo: Todo) => void;
    onSave: (todo: Todo, title: string) => void;
    onDestroy: (todo: Todo) => void;
  } = $props();

  let editing = $state(false);
  let editText = $state("");
  let input: HTMLInputElement | undefined = $state();

  $effect(() => {
    if (editing) input?.focus();
  });

  const startEditing = () => {
    editText = todo.title;
    editing = true;
  };

  const submit = () => {
    if (!editing) return;
    editing = false;
    const title = editText.trim();
    if (!title) {
      onDestroy(todo);
    } else if (title !== todo.title) {
      onSave(todo, title);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      submit();
    } else if (event.key === "Escape") {
      editing = false;
    }
  };
</script>

<li class:completed={todo.completed} class:editing data-testid="todo-item">
  <div class="view">
    <input
      class="toggle"
      type="checkbox"
      checked={todo.completed}
      onchange={() => onToggle(todo)}
    />
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <label ondblclick={startEditing}>{todo.title}</label>
    <button class="destroy" aria-label="Delete" onclick={() => onDestroy(todo)}></button>
  </div>
  {#if editing}
    <input
      bind:this={input}
      bind:value={editText}
      class="edit"
      onblur={submit}
      onkeydown={onKeyDown}
    />
  {/if}
</li>
