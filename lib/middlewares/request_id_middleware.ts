/**
 * Request-ID middleware.
 *
 * Attaches a unique `x-request-id` header (UUID v4) to every response and
 * stores it on the context so downstream middlewares (e.g. the logger) can
 * correlate log entries with individual requests.
 * @module
 */
import type { DesoMiddleware } from "../types.ts";

/**
 * Middleware that assigns a unique request ID (UUID v4) to every request.
 *
 * The ID is set both as a response header and on the context store
 * (accessible via `context.get(key)`).
 *
 * @param key - Header and context key name (default `"x-request-id"`).
 *
 * ```ts
 * app.use(requestId());
 * app.use(logger({ format: "json" }));
 * ```
 */
export function requestId(key = "x-request-id"): DesoMiddleware {
  return (context, next) => {
    const id = crypto.randomUUID();
    context.set(key, id);
    context.header(key, id);
    return next();
  };
}
