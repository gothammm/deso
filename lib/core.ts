import type { DesoMiddlewareHandler, HttpMethod } from "./types.ts";
import { Registry } from "./core_registry.ts";
import { DesoRequestHandler } from "./request_handler.ts";
import type { DesoHandler } from "./types.ts";
import type { ServeInit } from "./deps.ts";
import { serve } from "./deps.ts";
import { DesoRouter } from "./_router.ts";

export class Deso extends DesoRequestHandler {
  #registry: Registry;
  #router: DesoRouter;
  #group = new Map<string, unknown>();
  constructor() {
    const registry = new Registry();
    super(registry);
    this.#registry = registry;
    this.#router = registry.router;
  }
  serve = (options: ServeInit) => {
    return serve(this.handle, options);
  };
  /**
   * Registers a middleware that runs before each request.
   * @param {DesoMiddlewareHandler} middleware
   * @returns {void}
   */
  before(middleware: DesoMiddlewareHandler) {
    const WILDCARD_PATH = "*";
    const registeredMiddlewares = this.#registry.middlewareRegistry;
    if (!registeredMiddlewares.has(WILDCARD_PATH)) {
      registeredMiddlewares.set(WILDCARD_PATH, [middleware]);
      return;
    }
    const existingMiddlewareHandlers = registeredMiddlewares.get("*") ?? [];
    registeredMiddlewares.set(
      WILDCARD_PATH,
      existingMiddlewareHandlers.concat(middleware),
    );
    return;
  }
  group = <Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddlewareHandler<Path>[], () => void]
  ) => {
    if (handlers.length <= 0) {
      return;
    }
    const [groupHandler] = handlers.slice(-1) as ((core: Deso) => void)[];
    const groupMiddlewares: unknown = handlers.slice(0, handlers.length - 1);
    this.#group.set("middlewares", groupMiddlewares);
    this.#group.set("prefix", path);
    groupHandler(this);
    this.#group.clear();
  };
  get = <Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddlewareHandler<Path>[], DesoHandler<Path>]
  ) => {
    this.#register("GET", path, ...handlers);
  };
  post = <Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddlewareHandler<Path>[], DesoHandler<Path>]
  ) => {
    this.#register("POST", path, ...handlers);
  };
  put = <Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddlewareHandler<Path>[], DesoHandler<Path>]
  ) => {
    this.#register("PUT", path, ...handlers);
  };
  patch = <Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddlewareHandler<Path>[], DesoHandler<Path>]
  ) => {
    this.#register("PATCH", path, ...handlers);
  };
  ["delete"] = <Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddlewareHandler<Path>[], DesoHandler<Path>]
  ) => {
    this.#register("DELETE", path, ...handlers);
  };
  any = <Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddlewareHandler<Path>[], DesoHandler<Path>]
  ) => {
    (["GET", "PATCH", "HEAD", "PUT", "POST", "PATCH"] as HttpMethod[]).forEach(
      (method: HttpMethod) => this.#register(method, path, ...handlers),
    );
  };
  #register = <Path extends string>(
    method: HttpMethod,
    path: Path,
    ...handlers: [...DesoMiddlewareHandler<Path>[], DesoHandler<Path>]
  ) => {
    if (handlers.length <= 0) {
      return;
    }
    const [handler] = handlers.slice(-1) as DesoHandler<Path>[];
    const middlewares: unknown = handlers.slice(0, handlers.length - 1);
    const routePath = (
      this.#group.has("prefix") ? `${this.#group.get("prefix")}${path}` : path
    ) as Path;
    const groupMiddlewares = (this.#group.get("middlewares") ??
      []) as DesoMiddlewareHandler[];
    this.#registry.middlewareRegistry.set(btoa(method + ":" + routePath), [
      ...groupMiddlewares,
      ...(middlewares as DesoMiddlewareHandler[]),
    ]);

    return this.#router.on(method, routePath, handler);
  };
}
