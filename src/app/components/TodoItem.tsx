import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import type { Todo } from "~/types/todo";

export default function TodoItem({
  todo,
  onToggle,
  onSave,
  onDestroy,
}: {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onSave: (todo: Todo, title: string) => void;
  onDestroy: (todo: Todo) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEditing = () => {
    setEditText(todo.title);
    setEditing(true);
  };

  const submit = () => {
    if (!editing) return;
    setEditing(false);
    const title = editText.trim();
    if (title) {
      if (title !== todo.title) onSave(todo, title);
      setEditText(title);
    } else {
      onDestroy(todo);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      submit();
    } else if (event.key === "Escape") {
      setEditText(todo.title);
      setEditing(false);
    }
  };

  const className = [todo.completed && "completed", editing && "editing"]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={className} data-testid="todo-item">
      <div className="view">
        <input
          className="toggle"
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo)}
        />
        <label onDoubleClick={startEditing}>{todo.title}</label>
        <button className="destroy" onClick={() => onDestroy(todo)} />
      </div>
      {editing && (
        <input
          ref={inputRef}
          className="edit"
          value={editText}
          onChange={(event) => setEditText(event.target.value)}
          onBlur={submit}
          onKeyDown={onKeyDown}
        />
      )}
    </li>
  );
}
