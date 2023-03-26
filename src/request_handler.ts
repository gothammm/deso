import type { DesoMiddleware } from "./types.ts";
import type { Registry } from "./core_registry.ts";
import { DesoRequest, HttpMethod } from "./types.ts";

export class DesoRequestHandler {
  #registry: Registry;
  constructor(registry: Registry) {
    this.#registry = registry;
  }
  async handle(request: Request): Promise<Response> {
    const desoRequest = this.#prepareRequest(request);
    return (
      (await this.#runMiddlewares(desoRequest)) ?? this.#runRequest(desoRequest)
    );
  }
  async #runRequest(request: DesoRequest): Promise<Response> {
    const requestMethod: HttpMethod = request.method as HttpMethod;
    const routerRegistry = this.#getRouterRegistry(requestMethod);
    const requestMatch = routerRegistry?.match(request.url);
    if (!requestMatch) {
      return new Response("Not found", {
        status: 404,
      });
    }
    return await requestMatch.handler(request);
  }
  #prepareRequest(request: Request): DesoRequest {
    const desoRequest = request as DesoRequest;
    desoRequest.context = new Map();
    return desoRequest;
  }
  async #runMiddlewares(
    request: DesoRequest
  ): Promise<Response | undefined | void> {
    const middlewaresToRun = this.#registry.middlewareRegistry.get("*") ?? [];
    if (middlewaresToRun.length <= 0) {
      return;
    }
    for (const middleware of middlewaresToRun) {
      const handler = (<DesoMiddleware>middleware)?.exec ?? middleware;
      const middlewareResult = await handler(request);
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
