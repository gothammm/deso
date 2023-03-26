import type {
  DesoMiddleware,
  DesoMiddlewareHandler,
} from "./types.ts";
import { Registry } from "./core_registry.ts";
import { DesoRequestHandler } from "./request_handler.ts";
import type { DesoHandler } from "./types.ts";

export class Deso extends DesoRequestHandler {
  #registry: Registry;
  #requestHandler: DesoRequestHandler;
  constructor() {
    const registry = new Registry();
    super(registry);
    this.#registry = registry;
    this.#requestHandler = new DesoRequestHandler(registry);
  }
  handle = (request: Request) => {
    return this.#requestHandler.handle(request);
  }
  use(middleware: DesoMiddleware | DesoMiddlewareHandler) {
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
  }
  get(path: string, handler: DesoHandler) {
    const pattern = new URLPattern({ pathname: path });
    this.#registry.routerGetRegistry.add(path, { handler, pattern });
  }
  post(path: string, handler: DesoHandler) {
    const pattern = new URLPattern({ pathname: path });
    this.#registry.routerPostRegistry.add(path, { handler, pattern });
  }
  put(path: string, handler: DesoHandler) {
    const pattern = new URLPattern({ pathname: path });
    this.#registry.routerPutRegistry.add(path, { handler, pattern });
  }
  patch(path: string, handler: DesoHandler) {
    const pattern = new URLPattern({ pathname: path });
    this.#registry.routerPatchRegistry.add(path, { handler, pattern });
  }
  del(path: string, handler: DesoHandler) {
    const pattern = new URLPattern({ pathname: path });
    this.#registry.routerDeleteRegistry.add(path, { handler, pattern });
  }
}
