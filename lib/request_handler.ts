import type { DesoMiddlewareHandler } from "./types.ts";
import { Registry } from "./core_registry.ts";
import { HttpMethod } from "./types.ts";
import { DesoContext } from "./context.ts";
import { DesoRouter } from "./router.ts";
import type { ConnInfo } from "./deps.ts";

export class DesoRequestHandler {
  #registry: Registry = new Registry();
  #router = new DesoRouter();
  constructor(registry: Registry) {
    this.#registry = registry;
  }
  handle = async (request: Request, conn: ConnInfo): Promise<Response> => {
    const context = new DesoContext(request, conn);
    const registeredMiddlewares = this.#registry.middlewareRegistry.get("*") ??
      [];
    if (registeredMiddlewares.length <= 0) {
      return this.#runRequest(context);
    }
    const middlewaresToRunBeforeRouteMatch = this.#runMiddlewares(
      registeredMiddlewares,
    );
    const middlewareResult = await middlewaresToRunBeforeRouteMatch(context);
    return middlewareResult ?? this.#runRequest(context);
  };
  async #runRequest(context: DesoContext): Promise<Response> {
    const request = context.req();
    const requestMethod: HttpMethod = request.method as HttpMethod;
    const routerRegistry = this.#registry.router;
    const matchResult = routerRegistry.match(request.url, requestMethod);
    if (!matchResult.node) {
      const path = new URL(request.url).pathname;
      return Promise.resolve(
        new Response(`404 - ${request.method} - ${path} Not Found`, {
          status: 404,
        }),
      );
    }
    const handler = matchResult.node.handler;
    const associatedMiddlewaresToRun =
      this.#registry.middlewareRegistry.get(matchResult.node.routeHash) ?? [];
    if (matchResult.params) {
      context.loadParams(matchResult.params);
    }
    if (associatedMiddlewaresToRun.length <= 0) {
      return handler(context);
    }
    const middlewareHandler = this.#runMiddlewares(associatedMiddlewaresToRun);
    const middlewarerResult = await middlewareHandler(context);
    return middlewarerResult ?? handler(context);
  }
  #runMiddlewares = (middlewares: Array<DesoMiddlewareHandler>) => {
    return async (
      context: DesoContext,
    ): Promise<Response | undefined | void> => {
      if (middlewares.length <= 0) {
        return Promise.resolve();
      }
      for (const middleware of middlewares) {
        const middlewareResult = await middleware(context);
        if (!middlewareResult) {
          continue;
        }
        return middlewareResult;
      }
    };
  };
}
