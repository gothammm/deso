import type { DesoMiddlewareHandler, HttpMethod } from "./types.ts";
import { Registry } from "./core_registry.ts";
import { DesoRequestHandler } from "./request_handler.ts";
import type { DesoHandler } from "./types.ts";
import type { ServeInit } from "./deps.ts";
import { AsyncLocalStorage } from "node:async_hooks";

export class Deso {
  #registry: Registry;
  #group = new Map<string, unknown>();
  #requestHandler: DesoRequestHandler;
  #contextStorage = new AsyncLocalStorage();
  /**
   * @param {Object} config Deso Configuration
   * @param {boolean} config.enableAsyncLocalStorage Runs AsyncLocalStorage hook for each request, enabling this would force the context to use this storage
   */
  constructor(
    private config: {
      enableAsyncLocalStorage: boolean;
    } = {
      enableAsyncLocalStorage: false,
    },
  ) {
    const registry = new Registry();
    this.#requestHandler = new DesoRequestHandler(registry);
    this.#registry = registry;
  }
  fetch = (request: Request) => this.#requestHandler.fetch(request);
  serve = (options: ServeInit) => {
    const server = Deno.serve(options, (request) => {
      if (this.config.enableAsyncLocalStorage) {
        return this.#contextStorage.run(
          new Map<string, unknown>(),
          () =>
            this.#requestHandler.fetch(request, {
              contextStorage: this.als,
            }),
        );
      }
      return this.#requestHandler.fetch(request);
    });
    return server.finished;
  };
  /**
   * Returns the async local storage for the app.
   * The async local storage only works when the app config `enableAsyncLocalStorage` is set to `true`
   * @returns {Map<string, unknown>}
   */
  get als(): Map<string, unknown> | undefined {
    return this.#contextStorage.getStore() as Map<string, unknown>;
  }
  /**
   * Registers a middleware that runs before each request.
   * @param {DesoMiddlewareHandler} middleware
   * @returns {void}
   */
  before(middleware: DesoMiddlewareHandler) {
    const WILDCARD_PATH = "*";
    const registeredMiddlewares = this.#registry.MIDDLEWARE;
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
  head = <Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddlewareHandler<Path>[], DesoHandler<Path>]
  ) => {
    this.#register("HEAD", path, ...handlers);
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
    this.#registry.MIDDLEWARE.set(`${method}:${routePath}`, [
      ...groupMiddlewares,
      ...(middlewares as DesoMiddlewareHandler[]),
    ]);
    return this.#registry.router[method].add(routePath, handler);
  };
}
