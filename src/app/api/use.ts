import { use } from "_/api";

/**
 * Global middleware - runs for every route in this folder.
 *
 * Anything narrower belongs in a cascading `use.ts` next to the routes it
 * covers, or in a route's own `use`.
 */
export default [
  use(async function requestLog(ctx, next) {
    const requestId = crypto.randomUUID();
    const startedAt = performance.now();

    // typed through `DefaultVariables` in api/env.d.ts
    ctx.set("requestId", requestId);
    ctx.header("x-request-id", requestId);

    await next();

    const duration = (performance.now() - startedAt).toFixed(1);
    console.log(
      `${ctx.req.method} ${ctx.req.path} ${ctx.res.status} ${duration}ms [${requestId}]`,
    );
  }),
];
