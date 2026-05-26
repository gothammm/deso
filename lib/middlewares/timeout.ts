/**
 * Request-timeout middleware.
 *
 * Wraps the downstream middleware chain in a `Promise.race` against a
 * configurable deadline. If the deadline is reached before the chain
 * completes, the middleware rejects with an error which propagates to
 * the error-handling layer.
 * @module
 */
import type { DesoMiddleware } from "../types.ts";

/** Options for the {@link timeout} middleware. */
export interface TimeoutOptions {
  /** Maximum request duration in milliseconds. */
  duration: number;
  /** Custom error message for timeouts (default: `"Request timed out"`). */
  errorMessage?: string;
}

/**
 * Middleware that enforces a maximum execution time for the downstream
 * middleware chain.
 *
 * @param options - Duration in milliseconds and optional error message.
 *
 * ```ts
 * app.use(timeout({ duration: 30_000 }));
 * ```
 */
export function timeout(options: TimeoutOptions): DesoMiddleware {
  const duration = options.duration;
  const errorMessage = options.errorMessage ?? "Request timed out";

  return async (_context, next) => {
    const result = await Promise.race([
      next(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), duration)
      ),
    ]);
    return result;
  };
}
