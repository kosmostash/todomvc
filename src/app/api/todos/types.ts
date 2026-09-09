/**
 * The todo contract, written once.
 *
 * These types drive the compile-time signatures, the runtime validators, the
 * typed fetch clients and the OpenAPI spec - there is no second schema to keep
 * in sync. `VRefine` is globally available, no import needed.
 *
 * Names carry a `T` suffix on purpose: a type named after a built-in (`Response`,
 * `Date`, `Record`...) is referenced as the built-in during schema derivation.
 */

/** A database id: a positive integer, never a float. */
export type TodoIdT = VRefine<number, { minimum: 1, multipleOf: 1 }>;

/** A todo title, as accepted from a client - trimmed by the handler before it is stored. */
export type TodoTitleT = VRefine<string, { minLength: 1, maxLength: 255 }>;

/** A todo as it crosses the wire. */
export type TodoT = {
  id: TodoIdT;
  title: string;
  completed: boolean;
};

export type NewTodoT = {
  title: TodoTitleT;
};

export type TodoPatchT = {
  title?: TodoTitleT;
  completed?: boolean;
};

/** Body of the collection-wide toggle. */
export type ToggleAllT = {
  completed: boolean;
};
