/**
 * Provides the {@link compose} function that chains middlewares and a final
 * handler into a single callable using the next()-pattern.
 * @module
 */
import type { DesoContext } from "./context.ts";
import type { DesoHandler, DesoMiddleware } from "./types.ts";

/**
 * Compose an array of middlewares and a final handler into a single function.
 *
 * Middlewares are invoked left-to-right. Each middleware receives the context
 * and a `next` function that, when called, invokes the next middleware in the
 * chain. The last middleware calls the final handler.
 *
 * @param middlewares - Ordered list of middleware functions.
 * @param handler - Terminal handler that produces the response.
 * @returns A function that accepts a context and returns a response promise.
 *
 * ```ts
 * const stack = compose([auth, logger], handler);
 * const response = await stack(ctx);
 * ```
 */
export function compose(
  middlewares: DesoMiddleware[],
  handler: DesoHandler,
): (context: DesoContext) => Promise<Response> {
  // deno-lint-ignore require-await
  return async (context: DesoContext) => {
    const dispatch = (index: number): Promise<Response> => {
      if (index === middlewares.length) {
        return Promise.resolve(handler(context));
      }
      return Promise.resolve(
        middlewares[index](context, () => dispatch(index + 1)),
      );
    };
    return dispatch(0);
  };
}
