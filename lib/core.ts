import type { DesoMiddleware, DesoMiddlewareHandler, HttpMethod } from "./types.ts";
import { Registry } from "./core_registry.ts";
import { DesoRequestHandler } from "./request_handler.ts";
import type { DesoHandler } from "./types.ts";
import type { ServeInit } from "https://deno.land/std@0.181.0/http/server.ts";
import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

export class Deso extends DesoRequestHandler {
  #registry: Registry;
  #group = new Map<string, unknown>();
  constructor() {
    const registry = new Registry();
    super(registry);
    this.#registry = registry;
  }
  serve = (options: ServeInit) => {
    return serve(this.handle, options);
  };
  /**
   * Registers a middleware that runs before each request.
   * @param {DesoMiddleware | DesoMiddlewareHandler} middleware
   * @returns {void}
   */
  before(middleware: DesoMiddleware | DesoMiddlewareHandler) {
    const WILDCARD_PATH = "*";
    const registeredMiddlewares = this.#registry.middlewareRegistry;
    if (!registeredMiddlewares.has(WILDCARD_PATH)) {
      registeredMiddlewares.set(WILDCARD_PATH, [middleware]);
      return;
    }
    const existingMiddlewareHandlers = registeredMiddlewares.get("*") ?? [];
    registeredMiddlewares.set(
      WILDCARD_PATH,
      existingMiddlewareHandlers.concat(middleware)
    );
    return;
  }
  group = <Path extends string>(path: Path, ...handlers: [...DesoMiddlewareHandler<Path>[], () => void]) => {
    if (handlers.length <= 0) {
      return;
    }
    const [groupHandler] = handlers.slice(-1) as ((core: Deso) => void)[];
    const groupMiddlewares: unknown = handlers.slice(0, handlers.length - 1);
    this.#group.set('middlewares', groupMiddlewares);
    this.#group.set('prefix', path);
    groupHandler(this);
    this.#group.clear();
  }
  get = <Path extends string>(path: Path, ...handlers: [...DesoMiddlewareHandler<Path>[], DesoHandler<Path>]) => {
    this.#register("GET", path, ...handlers);
  };
  post = <Path extends string>(path: Path, ...handlers: [...DesoMiddlewareHandler<Path>[], DesoHandler<Path>]) => {
    this.#register("POST", path, ...handlers);
  };
  put = <Path extends string>(path: Path, ...handlers: [...DesoMiddlewareHandler<Path>[], DesoHandler<Path>]) => {
    this.#register("PUT", path, ...handlers);
  };
  patch = <Path extends string>(path: Path, ...handlers: [...DesoMiddlewareHandler<Path>[], DesoHandler<Path>]) => {
    this.#register("PATCH", path, ...handlers);
  };
  ['delete'] = <Path extends string>(path: Path, ...handlers: [...DesoMiddlewareHandler<Path>[], DesoHandler<Path>]) => {
    this.#register("DELETE", path, ...handlers);
  };
  #register = <Path extends string>(method: HttpMethod, path: Path, ...handlers: [...DesoMiddlewareHandler<Path>[], DesoHandler<Path>]) => {
    if (handlers.length <= 0) {
      return;
    }
    const [handler] = handlers.slice(-1) as DesoHandler<Path>[];
    const middlewares: unknown = handlers.slice(0, handlers.length - 1);
    const routePath = (this.#group.has('prefix') ? `${this.#group.get('prefix')}${path}` : path) as Path;
    const groupMiddlewares = (this.#group.get('middlewares') ?? []) as DesoMiddlewareHandler[];
    this.#registry.middlewareRegistry.set(`${method}:${routePath}`, [...groupMiddlewares, ...middlewares as DesoMiddlewareHandler[]]);
    switch(method) {
      case "GET":
        return this.#registry.getRouter.add(routePath, handler);
      case "DELETE":
        return this.#registry.deleteRouter.add(routePath, handler);
      case "PUT":
        return this.#registry.putRouter.add(routePath, handler);
      case "PATCH":
        return this.#registry.patchRouter.add(routePath, handler);
      case "POST":
        return this.#registry.postRouter.add(routePath, handler);
    }
  };
}
