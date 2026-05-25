import type { DesoMiddleware } from "../types.ts";

export function requestId(key = "x-request-id"): DesoMiddleware {
  return (context, next) => {
    const id = crypto.randomUUID();
    context.set(key, id);
    context.header(key, id);
    return next();
  };
}
