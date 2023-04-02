import type { DesoMiddleware } from "./types.ts";
import { Registry } from "./core_registry.ts";
import { HttpMethod } from "./types.ts";
import { DesoContext } from "./context.ts";
import { DesoRouter } from "./router.ts";
import type { RouteParams } from "./router.ts";

export class DesoRequestHandler {
  #registry: Registry = new Registry();
  #router = new DesoRouter();
  constructor(registry: Registry) {
    this.#registry = registry;
  }
  handle = async (request: Request): Promise<Response> => {
    // prepare request context.
    const context = new DesoContext(request);
    return (await this.#runMiddlewares(context)) ?? this.#runRequest(context);
  };
  #runRequest(context: DesoContext): Promise<Response> {
    const request = context.req();
    const requestMethod: HttpMethod = request.method as HttpMethod;
    const routerRegistry = this.#getRouterRegistry(requestMethod);
    const [path, handler, params] = routerRegistry.match(request.url);
    if (!handler) {
      return Promise.resolve(
        new Response(`404 - ${request.method} - ${path} Not Found`, {
          status: 404,
        }),
      );
    }
    return Promise.resolve(context.loadParams(params)).then(handler);
  }
  #loadParamsContext(
    context: DesoContext,
    routeParams: RouteParams,
  ): Promise<DesoContext> {
    const contextStore = context._store();
    Object.entries(routeParams).forEach(([key, value]) => {
      contextStore.set(`params:${key}`, value);
    });
    return Promise.resolve(context);
  }
  async #runMiddlewares(
    context: DesoContext,
  ): Promise<Response | undefined | void> {
    const middlewaresToRun = this.#registry.middlewareRegistry.get("*") ?? [];
    if (middlewaresToRun.length <= 0) {
      return;
    }
    for (const middleware of middlewaresToRun) {
      const handler = (<DesoMiddleware> middleware)?.exec ?? middleware;
      const middlewareResult = await handler(context);
      if (!middlewareResult) {
        continue;
      }
      return middlewareResult;
    }
  }
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
