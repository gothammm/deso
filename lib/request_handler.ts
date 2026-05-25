import { compose } from "./compositor.ts";
import { DesoContext } from "./context.ts";
import type { Registry } from "./core_registry.ts";
import { STATUS_CODE } from "./deps.ts";
import type { DesoMiddleware, HttpMethod } from "./types.ts";

export class DesoRequestHandler {
  #registry: Registry;

  constructor(registry: Registry) {
    this.#registry = registry;
  }

  async fetch(
    request: Request,
    options?: {
      contextStorage?: Map<string, unknown>;
    },
  ): Promise<Response> {
    const context = new DesoContext(request, options);

    try {
      return await this.#handleRequest(context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = error instanceof Error && "status" in error
        ? (error as Error & { status: number }).status
        : STATUS_CODE.InternalServerError;
      return context.oops(message, status);
    }
  }

  #handleRequest(context: DesoContext): Promise<Response> {
    const url = new URL(context.req().url);
    const pathname = url.pathname;
    const method = context.req().method as HttpMethod;

    const globalMiddlewares = this.#registry.getGlobalMiddlewares();

    if (globalMiddlewares.length > 0) {
      return this.#runWithGlobals(context, pathname, method, globalMiddlewares);
    }

    return this.#routeAndHandle(context, pathname, method);
  }

  #runWithGlobals(
    context: DesoContext,
    pathname: string,
    method: HttpMethod,
    middlewares: DesoMiddleware[],
  ): Promise<Response> {
    // deno-lint-ignore require-await
    const dispatch = async (index: number): Promise<Response> => {
      if (index === middlewares.length) {
        return this.#routeAndHandle(context, pathname, method);
      }
      return middlewares[index](context, () => dispatch(index + 1));
    };
    return dispatch(0);
  }

  #routeAndHandle(
    context: DesoContext,
    pathname: string,
    method: HttpMethod,
  ): Promise<Response> {
    const router = this.#registry.getRouter(method);
    if (!router) {
      return Promise.resolve(
        context.oops("405 - Method Not Allowed", STATUS_CODE.MethodNotAllowed),
      );
    }

    const [handler, params, pathPattern] = router.match(pathname);

    if (!handler) {
      const isMethodNotAllowed = this.#registry.pathExistsInAnyMethod(pathname);
      const status = isMethodNotAllowed
        ? STATUS_CODE.MethodNotAllowed
        : STATUS_CODE.NotFound;
      const message = isMethodNotAllowed
        ? `405 - ${method} ${pathname} Method Not Allowed`
        : `404 - ${method} ${pathname} Not Found`;
      return Promise.resolve(context.oops(message, status));
    }

    context.store.set("path_pattern", pathPattern);

    if (params.size > 0) {
      context.loadParams(params);
    }

    const routeMiddlewares = this.#registry.getRouteMiddlewares(
      method,
      pathPattern,
    );

    if (routeMiddlewares.length === 0) {
      return Promise.resolve(handler(context));
    }

    return compose(routeMiddlewares, handler)(context);
  }
}
