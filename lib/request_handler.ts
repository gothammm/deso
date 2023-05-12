import type { DesoMiddlewareHandler } from "./types.ts";
import { Registry } from "./core_registry.ts";
import { HttpMethod } from "./types.ts";
import { DesoContext } from "./context.ts";
import { parseUrl } from "./url.ts";

export class DesoRequestHandler {
  #registry: Registry = new Registry();
  constructor(registry: Registry) {
    this.#registry = registry;
  }
  fetch = async (request: Request): Promise<Response> => {
    const context = new DesoContext(request);
    const registeredMiddlewares = this.#registry.MIDDLEWARE.get("*") ?? [];
    if (registeredMiddlewares.length <= 0) {
      return this.#runRequest(context);
    }
    const middlewareResult = await this.#runMiddlewares(
      registeredMiddlewares,
      context,
    );
    return middlewareResult ?? this.#runRequest(context);
  };
  async #runRequest(context: DesoContext): Promise<Response> {
    const request = context.req();
    const urlParts = parseUrl(request.url);
    if (!urlParts) {
      return Promise.resolve(
        new Response(`400 - Bad Request - URL Malformed`, { status: 400 }),
      );
    }
    const { pathname, searchParams } = urlParts;
    const requestMethod: HttpMethod = request.method as HttpMethod;
    const routerRegistry = this.#registry.router[requestMethod];
    const [handler, params, pathPattern] = routerRegistry.match(pathname) ?? [];
    if (!handler) {
      return Promise.resolve(
        new Response(`404 - ${request.method} - ${pathname} Not Found`, {
          status: 404,
        }),
      );
    }
    context.store.set("path_pattern", pathPattern);
    const associatedMiddlewaresToRun =
      this.#registry.MIDDLEWARE.get(requestMethod + ":" + pathPattern) ?? [];

    if (params.size > 0 || searchParams.size > 0) {
      context.loadParams(params).loadParams(searchParams);
    }
    if (associatedMiddlewaresToRun.length <= 0) {
      return handler(context);
    }
    const middlewarerResult = await this.#runMiddlewares(
      associatedMiddlewaresToRun,
      context,
    );
    return middlewarerResult ?? handler(context);
  }
  #runMiddlewares = async (
    middlewares: Array<DesoMiddlewareHandler>,
    context: DesoContext,
  ) => {
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
}
