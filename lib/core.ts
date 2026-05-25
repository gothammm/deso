import { AsyncLocalStorage } from "node:async_hooks";
import { Registry } from "./core_registry.ts";
import { DesoRequestHandler } from "./request_handler.ts";
import type { DesoHandler, DesoMiddleware, HttpMethod } from "./types.ts";
import type { WsHandlers } from "./ws/mod.ts";
import { wsHandler } from "./ws/mod.ts";

export class Deso {
  #registry: Registry;
  #requestHandler: DesoRequestHandler;
  #contextStorage = new AsyncLocalStorage<Map<string, unknown>>();
  #groupStack: Array<{ prefix: string; middlewares: DesoMiddleware[] }> = [];
  #config: { enableAsyncLocalStorage: boolean };

  constructor(config: { enableAsyncLocalStorage?: boolean } = {}) {
    this.#config = {
      enableAsyncLocalStorage: config.enableAsyncLocalStorage ?? false,
    };
    this.#registry = new Registry();
    this.#requestHandler = new DesoRequestHandler(this.#registry);
  }

  serve(options: Deno.ServeTcpOptions = { port: 3000 }): Promise<void> {
    if (options.signal) {
      const server = Deno.serve(options, (request) => this.fetch(request));
      return server.finished;
    }

    const ac = new AbortController();
    const server = Deno.serve(
      { ...options, signal: ac.signal },
      (request) => this.fetch(request),
    );

    const shutdown = () => {
      try {
        ac.abort();
      } catch {
        // already aborted
      }
    };

    Deno.addSignalListener("SIGINT", shutdown);
    Deno.addSignalListener("SIGTERM", shutdown);

    return server.finished.finally(() => {
      try {
        Deno.removeSignalListener("SIGINT", shutdown);
      } catch {
        /* not registered */
      }
      try {
        Deno.removeSignalListener("SIGTERM", shutdown);
      } catch {
        /* not registered */
      }
    });
  }

  fetch = (request: Request): Promise<Response> => {
    if (this.#config.enableAsyncLocalStorage) {
      return this.#contextStorage.run(
        new Map<string, unknown>(),
        () =>
          this.#requestHandler.fetch(request, {
            contextStorage: this.als,
          }),
      );
    }
    return this.#requestHandler.fetch(request);
  };

  get als(): Map<string, unknown> | undefined {
    return this.#contextStorage.getStore() as Map<string, unknown> | undefined;
  }

  use(...middlewares: DesoMiddleware[]): void {
    for (const middleware of middlewares) {
      this.#registry.addGlobalMiddleware(middleware);
    }
  }

  group<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], (core: Deso) => void]
  ): void {
    if (handlers.length === 0) return;
    const callback = handlers.pop() as (core: Deso) => void;
    const middlewares = handlers as DesoMiddleware[];

    this.#groupStack.push({ prefix: path, middlewares });
    try {
      callback(this);
    } finally {
      this.#groupStack.pop();
    }
  }

  get<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], DesoHandler<Path>]
  ): void {
    this.#register("GET" as HttpMethod, path, ...handlers);
  }

  post<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], DesoHandler<Path>]
  ): void {
    this.#register("POST" as HttpMethod, path, ...handlers);
  }

  put<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], DesoHandler<Path>]
  ): void {
    this.#register("PUT" as HttpMethod, path, ...handlers);
  }

  patch<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], DesoHandler<Path>]
  ): void {
    this.#register("PATCH" as HttpMethod, path, ...handlers);
  }

  delete<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], DesoHandler<Path>]
  ): void {
    this.#register("DELETE" as HttpMethod, path, ...handlers);
  }

  head<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], DesoHandler<Path>]
  ): void {
    this.#register("HEAD" as HttpMethod, path, ...handlers);
  }

  options<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], DesoHandler<Path>]
  ): void {
    this.#register("OPTIONS" as HttpMethod, path, ...handlers);
  }

  any<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], DesoHandler<Path>]
  ): void {
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
      this.#register(method, path, ...handlers);
    }
  }

  ws<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], WsHandlers]
  ): void {
    const wsHandlers = handlers.pop() as WsHandlers;
    const middlewares = handlers as DesoMiddleware[];
    this.#register(
      "GET" as HttpMethod,
      path,
      ...middlewares,
      wsHandler(wsHandlers) as DesoHandler<Path>,
    );
  }

  #register<Path extends string>(
    method: HttpMethod,
    path: Path,
    ...handlers: [...DesoMiddleware[], DesoHandler<Path>]
  ): void {
    if (handlers.length === 0) return;

    const handler = handlers.pop() as DesoHandler<Path>;
    const middlewares = handlers as DesoMiddleware[];

    const effectivePath = this.#getEffectivePath(path);
    const effectiveMiddlewares = this.#getEffectiveMiddlewares(middlewares);

    if (effectiveMiddlewares.length > 0) {
      this.#registry.setRouteMiddlewares(
        method,
        effectivePath,
        effectiveMiddlewares,
      );
    }

    this.#registry.addRoute(method, effectivePath, handler);
  }

  #getEffectivePath(path: string): string {
    let result = path;
    for (let i = this.#groupStack.length - 1; i >= 0; i--) {
      const group = this.#groupStack[i];
      // Only prepend prefix if path doesn't already start with it
      if (!result.startsWith(group.prefix)) {
        result = group.prefix + result;
      }
    }
    return result;
  }

  #getEffectiveMiddlewares(
    routeMiddlewares: DesoMiddleware[],
  ): DesoMiddleware[] {
    const groupMiddlewares = this.#groupStack.flatMap((g) => g.middlewares);
    return [...groupMiddlewares, ...routeMiddlewares];
  }
}
