# Impressions: building TodoMVC on KosmoJS

Notes written straight after the build, while the bruises are fresh. The task was a
complete TodoMVC — spec markup, spec behaviour — with a real backend and SQLite storage,
built the way I'd build a project of my own rather than the way a demo gets built.

Roughly two hours, start to green: read the docs, scaffold, data layer, API, UI, tests,
verification from a clean clone. Reference points I'm carrying in from elsewhere are
Next's App Router, TanStack Start/Router, tRPC, and plain Vite + Hono wired by hand.

---

## How it went

Faster than I expected, and the shape of the app was decided almost entirely by the
framework's conventions rather than by me. That is meant as a compliment: the decisions
KosmoJS makes are the boring ones (where routes live, how validation is declared, what is
derived), and it leaves the interesting ones (data model, state, error UX) alone.

The one genuine surprise in the timeline was that most of my debugging time went into two
things that had nothing to do with routing or validation — a `204` response and a
pre-hydration form submit. Both are written up below.

---

## What pleased

**Derivation is the compiler kind, not the scaffolding kind.** `api/todos/types.ts` is
~30 lines. From it came the handler's compile-time types, TypeBox validators on the
server, the same validators in the browser, the typed fetch clients, and a complete
OpenAPI 3.1 document. I wrote no schema. Nothing to keep in sync means nothing to drift.
This is the single thing I'd tell someone about the framework.

**The validation catches things at the right boundary.** Typing `[id]` as
`VRefine<number, { minimum: 1, multipleOf: 1 }>` means `/api/todos/1.5` is a clean 400
before my handler runs. Without it, a float sails past `number`, reaches SQLite, and
comes back as a driver error at 2am. Same for `?completed=true` — `query` coerces
booleans, so the handler reads a real `boolean`. Small things, but they are exactly the
class of bug that survives code review.

**`lib/` in the open.** Derived code lives in the project, readable, with my route names
on it — not hidden in `node_modules`. When the fetch client behaved oddly I opened
`lib/app/api/todos/fetch.ts` and read what it actually does in thirty seconds. That
transparency paid for itself twice in one afternoon.

**The committed derivation cache.** `lib/.gitignore` ignores everything except
`cache.json` and `types.ts`, so a fresh clone gets the per-route cache and skips a full
rebuild. I cloned the pushed branch to verify the project stands on its own, and the
first build took under a second. That is a detail somebody thought carefully about.

**Directory routing, and only `index` is a route.** `api/todos/types.ts` and
`api/todos/title.ts` sit next to the route they serve and are unambiguously not routes.
Coming from file-based routing where `schema.ts` might be a `/schema` endpoint, the extra
folder pays for itself immediately. `tree src/app/api` is the API map.

**Isomorphic fetch, actually isomorphic.** One call site:

```ts
export const loader = () => GET();
```

During SSR that dispatches into the Hono app in-process; in the browser it is a
same-origin request. I verified both — the server-rendered HTML contains the todo titles,
and the browser doesn't refetch on hydration. No `dehydrate`/`hydrate` plumbing, no
second "server client" import, no `globalThis.fetch` monkey-patching. This is the best
argument the framework makes, and the docs page explaining *why* the HTTP boundary stays
([why-http](https://kosmojs.dev/essentials/why-http)) is the best thing I read all day.

**"Let handlers fail."** Handlers `throw new HTTPError([404, …])` and `api/errors.ts` is
the one place that decides what a failure looks like. My routes have no `try`/`catch` at
all and the error shape is identical everywhere. Framework guidance that *removes* code
is rare.

**The docs anticipated me.** [agents.md](https://kosmojs.dev/agents) says: in containers,
don't trust the file watcher to seed files — create them empty and run the build instead.
That is precisely my situation, and it worked exactly as described. There is also a
"silent failure checklist" page listing the four mistakes that typecheck and then
misbehave. A framework that documents its own sharp edges, by name, in one place, is
telling you something good about its authors.

---

## What surprised

**The dev server never server-renders.** `ssr: true` and `pnpm dev` still gives you
client rendering — SSR only exists in a production build. It's documented loudly and the
reasoning is sound (HMR against a production bundle is a lie), but it does mean the
`preview` command is not optional: it's where half your rendering behaviour lives. I put
the e2e suite against `dist/run.js` for exactly this reason.

**`defineRoute<"todos/[id]">` restates the path.** My first reaction was "the file
already knows where it is". The reasoning is airtight — TypeScript can't see the
filesystem, the string is a key into the derived `RouteMap`, and that lookup is what types
`ctx.validated.params` — and it can't drift, because a stale name is a compile error. I
came around, but it's the one bit of syntax I'd expect every newcomer to question.

**Types are read as source text, not just as types.** The wrapping `[]` and `{}` of a
params tuple, a response tuple, or a `VRefine` constraint must be written literally;
aliasing them silently breaks derivation. Contents can be aliased freely. It's a
reasonable trade for schema-from-types, but it means "these are just TypeScript types" is
true only up to a point, and the exceptions have to be memorised.

**`api/use.ts` is per route, not per request.** A request that matches no route never
reaches global middleware. Coming from Express `app.use()` or Next's `middleware.ts` this
is a real semantic difference — rewrites and blanket header injection belong on the native
app instance in `api/app.ts` or at your proxy.

**Defaults I didn't have to think about:** undefined methods answer `405`, `HEAD` is
served by the `GET` handler with the body dropped, static routes beat dynamic ones. Each
one is a thing I'd have hand-rolled elsewhere.

---

## What confused

**The first build derives from empty files.** Creating blank route files and running
`pnpm build` seeds them *and* derives from them in the same pass — so the derivation sees
the empty version, and my fetch client came out with `path`/`href` but no HTTP methods.
A second build fixed it. Obvious in hindsight, but I lost a few minutes staring at a
client that was missing its `GET`, and I didn't find this stated anywhere.

**`response: [204]` is a trap with two independent bites.** A bodyless response variant is
documented as legal (`[409]` appears in the docs), but: (1) the derived
`lib/app/api/todos/[id]/schemas.ts` doesn't typecheck — it emits `{ status: 204 }` where a
full `ValidationSchema` is expected; and (2) the fetch client parses every response as
JSON, so an empty body throws a parse error *on success*. `DELETE` returning the removed
todo is arguably nicer anyway, but I arrived there by accident rather than by design.

**No type for "no body".** A handler without a `response` gives the client
`Promise<unknown>`, which is deliberate and defensible. But there's no way to say
"this really returns nothing" and get `Promise<void>`.

**`useLoaderData()` is the untyped seam.** Everything from the database to the fetch
client is typed end to end, and then the last hop into the component needs
`useLoaderData<Array<TodoT>>()`. That's React Router's boundary, not KosmoJS's, and the
docs are upfront about annotating it — but in a pipeline this carefully typed, the one
manual annotation stands out.

**Where does client state live?** Each filter is its own route, so navigating remounts the
page and re-runs the loader. Correct and simple, but nothing carries a client cache across
routes unless you opt into TanStack Query. Not a flaw — just a decision the framework
hands you rather than makes.

---

## What annoyed

**The scaffolder's base URL.** `pnpm create kosmo .` (bootstrapping into an existing
directory) produced `frontend.base: "/app"` and `backend.base: "/app/api"`, while the docs
say the first folder is `app` serving pages at `/` and its API at `/api`. Editing
`kosmo.config.ts` is expected and supported, so it cost me one minute — but it's a
mismatch between the documented promise and the observed behaviour.

**A React version mismatch out of the box.** The scaffold pins `react` and `react-dom`
independently; pnpm resolved `19.2.8` and `19.3.0`. Everything built, typechecked, and
passed — and then `dist/run.js` refused to start with a runtime "Incompatible React
versions". A build-time error would have cost me nothing; a runtime one cost me a
debugging detour.

**No progressive enhancement, and SSR makes you feel it.** With SSR on, the server ships
real HTML that isn't interactive yet. My `<form onSubmit={…}>` around the new-todo input
did a *native* GET submit when the user (my e2e suite, in this case) typed before
hydration — navigating away and losing the todo. The fix is fine (`Enter` on a bare input,
which is the spec's gesture anyway), and the docs do say there is no form-post story. But
the failure mode is silent, timing-dependent, and it only exists because SSR is on. I'd
like a documented pattern here — even just "disable submit until hydrated".

**`lib/.gitignore` ignores itself.** Its own `*` rule matches it, so it never gets
committed; a clone has no ignore rules in `lib/` until the first build writes them. I
`git add -f`'d it. Minor, but the file is load-bearing enough that it should ship.

**Small stuff:** validation messages are developer-perfect and user-hostile
(`params: id: must be a multiple of 1`), so anything user-facing needs the custom-message
hook; and `todomvc-app-css` makes lightningcss warn on every single build (third-party
CSS, not KosmoJS's fault, but it's noise in every log I read today).

---

## What I missed, coming from other full-stack frameworks

Ordered by how much I actually wanted them during this build.

**A test story.** This is the biggest gap. There is no seeded test setup, no documented
way to boot the API in-process and fire requests at it — even though `light-my-request` is
already a dependency of every project and the SSR transport does exactly that internally.
A `createTestClient(app)` returning the typed fetch clients bound to an in-memory
transport would make API tests trivial and would fall naturally out of machinery that
already exists. I ended up testing the store with vitest and everything else through a
real server plus Playwright, which works, but it's a heavier loop than it should be.

**`<head>` / metadata.** No `metadata` export, no per-route title convention. My title
lives in `index.html` and is the same on every page. Fine for TodoMVC, not fine for
anything with SEO. Next's `generateMetadata` and TanStack's `head` are things I reached
for and didn't find.

**Mutations and form state.** The route-plus-client trade is honest and cheap here — a
mutation is four lines. What's missing is the layer above: no `useActionState` equivalent,
no pending/error state per submission, no revalidation primitive. I hand-rolled optimistic
updates with rollback in `useTodos`, and I'd hand-roll them again in the next project.
That's a helper waiting to be written, not a design flaw — but everyone will write it.

**Loader caching.** React Router's `useRevalidator()` will re-run a loader, so
revalidation exists — what's missing above it is any cache or staleness model:
no `revalidatePath`, no tags, no `loaderDeps`. After a mutation, keeping the list correct
is entirely yours (I folded server responses back into local state). TanStack Query is a
first-class opt-in and is clearly the intended answer; I just note that without it,
"refetch after mutate" has no framework-blessed shape.

**Typed search params.** Query params are validated on the API contract, which is the
right place — but on the page side, reading `?filter=` is plain React Router. TanStack's
`validateSearch` typing `useSearch()` is genuinely nicer, and the docs list this as
considered-but-not-implemented.

**Route-level error UI.** React Router has `errorElement`; KosmoJS seeds a 404 page and
otherwise leaves boundaries to you, with the additional wrinkle that an SSR fetch failure
silently drops the whole page back to client rendering. That fallback is a defensible
trade, but "the page works, it just stopped being server-rendered, check the logs" is a
failure mode I'd want a first-class hook for. (There is an `onError` hook; it reports, it
doesn't change the outcome.)

**Database conventions.** Nothing about migrations, seeding, or connection lifecycle —
beyond the `teardownHandler` hook, which is exactly right and which I used. Coming from
Prisma/Drizzle-shaped projects, you notice that `db/` is entirely yours to design. I
consider this correct scoping, not an omission, but it *is* a thing you have to decide on
day one.

**What I did not miss:** RSC and `"use server"`. The explicit boundary cost me one route
file per resource and bought me a URL I can curl, middleware that actually sees every
request crossing the line, an OpenAPI spec I didn't write, and a client that validates
before it sends. I'd take that trade again.

---

## If someone hands you this framework tomorrow

1. Read [agents.md](https://kosmojs.dev/agents) and
   [validation/gotchas](https://kosmojs.dev/validation/gotchas) first. Twenty minutes,
   and they cover the failures that don't announce themselves.
2. Create route files empty, build, then write your logic — and build twice the first
   time.
3. Declare `response` on every handler whose result the frontend consumes. It's one line
   and it turns on typing, validation and the spec together.
4. Keep `pnpm preview` in your loop from day one if SSR is on. The dev server will not
   show you what production does.
5. Don't return `204`.

**Verdict:** the parts that are hard to build yourself — derived validation, typed
clients, an OpenAPI spec that stays true, an SSR fetch with no network hop — are done
well and stayed out of my way. The parts that are missing are mostly *conveniences* I can
write once and reuse, not architectural gaps. That's a good place for a young framework to
be.
