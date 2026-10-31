# TodoMVC · KosmoJS (Svelte + Hono)

[TodoMVC](https://github.com/tastejs/todomvc/blob/master/app-spec.md) built with
[KosmoJS](https://kosmojs.dev). It follows the spec, except that todos are stored
on the server in SQLite (`node:sqlite`) instead of `localStorage`.

## Stack

- frontend: Svelte (`src/app/pages`, `src/app/components`)
- backend: Hono (`src/app/api`)
- storage: SQLite, file location from `TODOS_DB` (default `var/todos.sqlite`)

## Routes

| Path         | Shows               |
| ------------ | ------------------- |
| `/`          | all todos           |
| `/active`    | active todos        |
| `/completed` | completed todos     |

The filter is an optional route param (`pages/{filter}/index.tsx`); any other value renders the 404 page.
Todos are loaded by a page `loader` read with `useLoaderData()`: in production it runs during SSR, calling the API
in-process, so the delivered HTML already contains the filtered list and hydration reuses that data.
Filter links are plain links, so every filter change is a server-rendered page load.

## API

| Method   | Path              | Body                                    | Purpose                    |
| -------- | ----------------- | --------------------------------------- | -------------------------- |
| `GET`    | `/api/todos`      |                                         | list todos                 |
| `POST`   | `/api/todos`      | `{ title }`                             | create a todo              |
| `PATCH`  | `/api/todos`      | `{ completed }`                         | mark all complete / active |
| `DELETE` | `/api/todos`      |                                         | clear completed            |
| `PATCH`  | `/api/todos/:id`  | `{ title?, completed? }`                | update a todo              |
| `DELETE` | `/api/todos/:id`  |                                         | destroy a todo             |

## Usage

```sh
pnpm install
pnpm dev        # http://127.0.0.1:4556
pnpm test       # KosmoJS test harness: API routes + browser tests of the TodoMVC spec
pnpm build && pnpm preview
```

The frontend harness runs with `frontend.test.ssr` enabled, so it serves the production SSR build:

- server-rendered HTML tests fetch each route and assert on the markup with `cheerio` (no browser)
- browser tests drive Chromium via `playwright` against the same server

Tests use a separate database (`var/test.sqlite`).
