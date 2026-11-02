import { HTTPError, ValidationError } from "@kosmojs/core/errors";

import { errorHandlerFactory } from "_/api:factory";

export default errorHandlerFactory(async (ctx, next) => {
  try {
    await next();
  } catch (error: any) {
    const [status, message] = Array.isArray(error)
      ? error
      : error instanceof HTTPError
        ? [error.status, error.message]
        : error instanceof ValidationError
          ? [400, `${error.target}: ${error.errorMessage}`]
          : [error.statusCode || 500, error.message];

    ctx.status = status;

    if (ctx.accepts("json")) {
      ctx.body = { error: message };
    } else {
      ctx.body = message;
    }
  }
});
