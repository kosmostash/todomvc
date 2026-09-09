import { useEffect, useRef, useState } from "react";

import type { TodoT } from "~/hooks/useTodos";

export default function TodoItem(props: {
  todo: TodoT;
  onToggle: (completed: boolean) => void;
  onRename: (title: string) => void;
  onDestroy: () => void;
}) {
  const { todo } = props;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const input = useRef<HTMLInputElement>(null);

  // hiding the focused input makes the browser blur it, which would run commit()
  // a second time with a stale closure - a ref is what actually knows the state
  const isEditing = useRef(false);

  const toggleEditing = (next: boolean) => {
    isEditing.current = next;
    setEditing(next);
  };

  useEffect(() => {
    if (editing) {
      input.current?.focus();
      input.current?.select();
    }
  }, [editing]);

  const startEditing = () => {
    setDraft(todo.title);
    toggleEditing(true);
  };

  const cancelEditing = () => {
    setDraft(todo.title);
    toggleEditing(false);
  };

  /** The spec: an edit trimmed down to nothing destroys the todo. */
  const commit = () => {
    if (!isEditing.current) {
      return;
    }

    toggleEditing(false);

    const title = draft.trim();

    if (!title) {
      props.onDestroy();
    } else if (title !== todo.title) {
      props.onRename(title);
    }
  };

  return (
    <li className={[todo.completed && "completed", editing && "editing"].filter(Boolean).join(" ")}>
      <div className="view">
        <input
          className="toggle"
          type="checkbox"
          checked={todo.completed}
          onChange={(event) => props.onToggle(event.target.checked)}
          aria-label={`Toggle ${todo.title}`}
        />
        {/* double-click to edit is the TodoMVC interaction; the destroy button stays keyboard reachable */}
        <label onDoubleClick={startEditing}>{todo.title}</label>
        <button
          className="destroy"
          type="button"
          onClick={props.onDestroy}
          aria-label={`Delete ${todo.title}`}
        />
      </div>

      <input
        ref={input}
        className="edit"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
          } else if (event.key === "Escape") {
            cancelEditing();
          }
        }}
        aria-label={`Edit ${todo.title}`}
      />
    </li>
  );
}
