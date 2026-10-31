<script setup lang="ts">
import { nextTick, ref } from "vue";

import type { Todo } from "~/types/todo";

const props = defineProps<{ todo: Todo }>();

const emit = defineEmits<{
  toggle: [todo: Todo];
  save: [todo: Todo, title: string];
  destroy: [todo: Todo];
}>();

const editing = ref(false);
const editText = ref("");
const input = ref<HTMLInputElement>();

const startEditing = async () => {
  editText.value = props.todo.title;
  editing.value = true;
  await nextTick();
  input.value?.focus();
};

const submit = () => {
  if (!editing.value) return;
  editing.value = false;
  const title = editText.value.trim();
  if (!title) {
    emit("destroy", props.todo);
  } else if (title !== props.todo.title) {
    emit("save", props.todo, title);
  }
};

const cancel = () => {
  editing.value = false;
};
</script>

<template>
  <li
    :class="{ completed: todo.completed, editing }"
    data-testid="todo-item"
  >
    <div class="view">
      <input
        class="toggle"
        type="checkbox"
        :checked="todo.completed"
        @change="emit('toggle', todo)"
      />
      <label @dblclick="startEditing">{{ todo.title }}</label>
      <button class="destroy" @click="emit('destroy', todo)"></button>
    </div>
    <input
      v-if="editing"
      ref="input"
      v-model="editText"
      class="edit"
      @blur="submit"
      @keydown.enter="submit"
      @keydown.escape="cancel"
    />
  </li>
</template>
