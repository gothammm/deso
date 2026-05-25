import { DesoRouter } from "./router.ts";
import type { DesoHandler, DesoMiddleware, HttpMethod } from "./types.ts";

export class Registry {
  #routers = new Map<HttpMethod, DesoRouter>();
  #globalMiddlewares: DesoMiddleware[] = [];
  #routeMiddlewares = new Map<string, DesoMiddleware[]>();

  constructor() {
    const methods: HttpMethod[] = [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "HEAD",
      "OPTIONS",
    ];
    for (const method of methods) {
      this.#routers.set(method, new DesoRouter());
    }
  }

  addRoute(method: HttpMethod, path: string, handler: DesoHandler): void {
    const router = this.#routers.get(method);
    if (!router) {
      throw new Error(`No router for method: ${method}`);
    }
    router.add(path, handler);
  }

  getRouter(method: HttpMethod): DesoRouter | undefined {
    return this.#routers.get(method);
  }

  pathExistsInAnyMethod(path: string): boolean {
    for (const [, router] of this.#routers) {
      const [handler] = router.match(path);
      if (handler) return true;
    }
    return false;
  }

  addGlobalMiddleware(middleware: DesoMiddleware): void {
    this.#globalMiddlewares.push(middleware);
  }

  getGlobalMiddlewares(): DesoMiddleware[] {
    return this.#globalMiddlewares;
  }

  setRouteMiddlewares(
    method: HttpMethod,
    path: string,
    middlewares: DesoMiddleware[],
  ): void {
    this.#routeMiddlewares.set(`${method}:${path}`, middlewares);
  }

  getRouteMiddlewares(method: HttpMethod, path: string): DesoMiddleware[] {
    return this.#routeMiddlewares.get(`${method}:${path}`) ?? [];
  }
}
