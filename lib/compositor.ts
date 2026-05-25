import type { DesoContext } from "./context.ts";
import type { DesoHandler, DesoMiddleware } from "./types.ts";

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
