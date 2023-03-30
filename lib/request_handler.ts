import type { DesoMiddleware, RouteMatchResult } from "./types.ts";
import type { Registry } from "./core_registry.ts";
import { HttpMethod } from "./types.ts";
import { DesoContext } from "./context.ts";

export class DesoRequestHandler {
  #registry: Registry;
  constructor(registry: Registry) {
    this.#registry = registry;
  }
  async handle(request: Request): Promise<Response> {
    // prepare request context.
    const context = new DesoContext(request);
    return (await this.#runMiddlewares(context)) ?? this.#runRequest(context);
  }
  #runRequest(context: DesoContext): Promise<Response> {
    const request = context.req();
    const requestMethod: HttpMethod = request.method as HttpMethod;
    const routerRegistry = this.#getRouterRegistry(requestMethod);
    const requestMatch = routerRegistry?.match(request.url);
    if (!requestMatch) {
      return Promise.resolve(
        new Response("404 - Not Found", {
          status: 404,
        })
      );
    }
    return this.#loadParamsContext(context, requestMatch).then(
      requestMatch.handler
    );
  }
  #loadParamsContext(
    context: DesoContext,
    routeMatchResult: RouteMatchResult
  ): Promise<DesoContext> {
    const params = routeMatchResult.params ?? {};
    const contextStore = context._store();
    Object.entries(params).forEach(([key, value]) => {
      contextStore.set(`params:${key}`, value);
    });
    return Promise.resolve(context);
  }
  async #runMiddlewares(
    context: DesoContext
  ): Promise<Response | undefined | void> {
    const middlewaresToRun = this.#registry.middlewareRegistry.get("*") ?? [];
    if (middlewaresToRun.length <= 0) {
      return;
    }
    for (const middleware of middlewaresToRun) {
      const handler = (<DesoMiddleware>middleware)?.exec ?? middleware;
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
        return this.#registry.routerGetRegistry;
      case "DELETE":
        return this.#registry.routerDeleteRegistry;
      case "POST":
        return this.#registry.routerPostRegistry;
      case "PUT":
        return this.#registry.routerPutRegistry;
      case "PATCH":
        return this.#registry.routerPatchRegistry;
      default:
        return;
    }
  }
}
