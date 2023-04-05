import type { DesoMiddleware } from "./types.ts";
import { Registry } from "./core_registry.ts";
import { HttpMethod } from "./types.ts";
import { DesoContext } from "./context.ts";
import { DesoRouter } from "./router.ts";
import { DesoMiddlewareHandler } from "../mod.ts";

export class DesoRequestHandler {
  #registry: Registry = new Registry();
  #router = new DesoRouter();
  constructor(registry: Registry) {
    this.#registry = registry;
  }
  handle = async (request: Request): Promise<Response> => {
    const context = new DesoContext(request);
    const middlewaresToRunBeforeRouteMatch = this.#runMiddlewares(
      this.#registry.middlewareRegistry.get("*") ?? []
    );
    const middlewareResult = await middlewaresToRunBeforeRouteMatch(context);
    return middlewareResult ?? this.#runRequest(context);
  };
  #runRequest(context: DesoContext): Promise<Response> {
    const request = context.req();
    const requestMethod: HttpMethod = request.method as HttpMethod;
    const routerRegistry = this.#getRouterRegistry(requestMethod);
    const [path, handler, params, pathPattern] = routerRegistry.match(
      request.url
    );
    if (!handler) {
      return Promise.resolve(
        new Response(`404 - ${request.method} - ${path} Not Found`, {
          status: 404,
        })
      );
    }
    const associatedMiddlewaresToRun =
      this.#registry.middlewareRegistry.get(
        `${requestMethod}:${pathPattern}`
      ) ?? [];
    return Promise.resolve(context.loadParams(params))
      .then(this.#runMiddlewares(associatedMiddlewaresToRun))
      .then((middlewareResult) => {
        return middlewareResult ?? handler(context);
      });
  }
  #runMiddlewares = (
    middlewares: Array<DesoMiddleware | DesoMiddlewareHandler>
  ) => {
    return async (
      context: DesoContext
    ): Promise<Response | undefined | void> => {
      if (middlewares.length <= 0) {
        return Promise.resolve();
      }
      for (const middleware of middlewares) {
        const handler = (<DesoMiddleware>middleware)?.exec ?? middleware;
        const middlewareResult = await handler(context);
        if (!middlewareResult) {
          continue;
        }
        return middlewareResult;
      }
    };
  };
  #getRouterRegistry(method: HttpMethod) {
    switch (method) {
      case "GET":
        return this.#registry.getRouter;
      case "DELETE":
        return this.#registry.deleteRouter;
      case "POST":
        return this.#registry.postRouter;
      case "PUT":
        return this.#registry.putRouter;
      case "PATCH":
        return this.#registry.patchRouter;
      default:
        return this.#registry.getRouter;
    }
  }
}
