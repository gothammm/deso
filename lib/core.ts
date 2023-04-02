import type { DesoMiddleware, DesoMiddlewareHandler } from "./types.ts";
import { Registry } from "./core_registry.ts";
import { DesoRequestHandler } from "./request_handler.ts";
import type { DesoHandler } from "./types.ts";
import type { ServeInit } from "https://deno.land/std@0.181.0/http/server.ts";
import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

export class Deso extends DesoRequestHandler {
  #registry: Registry;
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
      existingMiddlewareHandlers.concat(middleware),
    );
    return;
  }
  get = <Path extends string>(path: Path, handler: DesoHandler<Path>) =>
    this.#registry.getRouter.add(path, handler);
  post = <Path extends string>(path: Path, handler: DesoHandler<Path>) =>
    this.#registry.postRouter.add(path, handler);
  put = <Path extends string>(path: Path, handler: DesoHandler<Path>) =>
    this.#registry.putRouter.add(path, handler);
  patch = <Path extends string>(path: Path, handler: DesoHandler<Path>) =>
    this.#registry.patchRouter.add(path, handler);
  ["delete"] = <Path extends string>(path: Path, handler: DesoHandler<Path>) =>
    this.#registry.deleteRouter.add(path, handler);
}
