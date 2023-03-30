import type { DesoMiddleware, DesoMiddlewareHandler } from "./types.ts";
import { Registry } from "./core_registry.ts";
import { DesoRequestHandler } from "./request_handler.ts";
import type { DesoHandler } from "./types.ts";
import type { ServeInit } from "https://deno.land/std@0.181.0/http/server.ts";
import { serve } from "https://deno.land/std@0.181.0/http/server.ts";

export class Deso extends DesoRequestHandler {
  #registry: Registry;
  #requestHandler: DesoRequestHandler;
  constructor() {
    const registry = new Registry();
    super(registry);
    this.#registry = registry;
    this.#requestHandler = new DesoRequestHandler(registry);
  }
  serve = (options: ServeInit) => {
    return serve(this.handle, options);
  }
  handle = (request: Request) => {
    return this.#requestHandler.handle(request);
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
  get<Path extends string>(path: Path, handler: DesoHandler<Path>) {
    const pattern = new URLPattern({ pathname: path });
    this.#registry.routerGetRegistry.add(path, { handler, pattern });
  }
  post<Path extends string>(path: Path, handler: DesoHandler<Path>) {
    const pattern = new URLPattern({ pathname: path });
    this.#registry.routerPostRegistry.add(path, { handler, pattern });
  }
  put<Path extends string>(path: Path, handler: DesoHandler<Path>) {
    const pattern = new URLPattern({ pathname: path });
    this.#registry.routerPutRegistry.add(path, { handler, pattern });
  }
  patch<Path extends string>(path: Path, handler: DesoHandler<Path>) {
    const pattern = new URLPattern({ pathname: path });
    this.#registry.routerPatchRegistry.add(path, { handler, pattern });
  }
  ['delete']<Path extends string>(path: Path, handler: DesoHandler<Path>) {
    const pattern = new URLPattern({ pathname: path });
    this.#registry.routerDeleteRegistry.add(path, { handler, pattern });
  }
}
