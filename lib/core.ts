/**
 * Application core — the main entry point for creating a Deso web server.
 *
 * Provides route registration (get/post/put/patch/delete/head/options/any),
 * middleware composition via `use()`, route grouping, WebSocket support,
 * and a thin `serve()` wrapper around `Deno.serve`.
 * @module
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { Registry } from "./core_registry.ts";
import { DesoRequestHandler } from "./request_handler.ts";
import type { DesoHandler, DesoMiddleware, HttpMethod } from "./types.ts";
import type { WsHandlers } from "./ws/mod.ts";
import { wsHandler } from "./ws/mod.ts";

/**
 * A Deso application instance.
 *
 * ```ts
 * const app = new Deso();
 * app.get("/hello", (ctx) => ctx.text("Hello!"));
 * app.serve({ port: 3000 });
 * ```
 */
export class Deso {
  #registry: Registry;
  #requestHandler: DesoRequestHandler;
  #contextStorage = new AsyncLocalStorage<Map<string, unknown>>();
  #groupStack: Array<{ prefix: string; middlewares: DesoMiddleware[] }> = [];
  #config: { enableAsyncLocalStorage: boolean };

  /**
   * Create a new Deso application.
   * @param config.enableAsyncLocalStorage - When `true`, enables
   *   `AsyncLocalStorage` so that per-request context is available outside
   *   the middleware chain (default `false`).
   */
  constructor(config: { enableAsyncLocalStorage?: boolean } = {}) {
    this.#config = {
      enableAsyncLocalStorage: config.enableAsyncLocalStorage ?? false,
    };
    this.#registry = new Registry();
    this.#requestHandler = new DesoRequestHandler(this.#registry);
  }

  /**
   * Start the HTTP server.
   *
   * Registers SIGINT/SIGTERM handlers for graceful shutdown.
   *
   * @param options - Standard `Deno.ServeTcpOptions` (default port 3000).
   * @returns A promise that resolves when the server shuts down.
   */
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

  /**
   * Handle a single HTTP request through the full middleware + routing chain.
   * Useful with `Deno.serve` directly or when embedding in another server.
   */
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

  /** Access the `AsyncLocalStorage` store for the current request, if enabled. */
  get als(): Map<string, unknown> | undefined {
    return this.#contextStorage.getStore() as Map<string, unknown> | undefined;
  }

  /**
   * Register one or more global middlewares that run on **every** request,
   * including unmatched (404) routes.
   *
   * @param middlewares - Middleware functions to apply globally.
   */
  use(...middlewares: DesoMiddleware[]): void {
    for (const middleware of middlewares) {
      this.#registry.addGlobalMiddleware(middleware);
    }
  }

  /**
   * Create a route group with an optional path prefix and shared middlewares.
   *
   * Inside the callback, all registered routes inherit the prefix and
   * middlewares. Groups can be nested.
   *
   * @param path - Optional path prefix (e.g. `/api`).
   * @param handlers - Shared middlewares followed by a callback that receives
   *   the current `Deso` instance.
   *
   * ```ts
   * app.group("/api", auth, (api) => {
   *   api.get("/users", listUsers);
   * });
   * ```
   */
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

  /**
   * Register a GET route.
   * @param path - Route pattern (e.g. `/users/:id`).
   * @param handlers - Optional middlewares followed by the terminal handler.
   */
  get<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], DesoHandler<Path>]
  ): void {
    this.#register("GET" as HttpMethod, path, ...handlers);
  }

  /**
   * Register a POST route.
   * @param path - Route pattern.
   * @param handlers - Optional middlewares followed by the terminal handler.
   */
  post<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], DesoHandler<Path>]
  ): void {
    this.#register("POST" as HttpMethod, path, ...handlers);
  }

  /**
   * Register a PUT route.
   * @param path - Route pattern.
   * @param handlers - Optional middlewares followed by the terminal handler.
   */
  put<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], DesoHandler<Path>]
  ): void {
    this.#register("PUT" as HttpMethod, path, ...handlers);
  }

  /**
   * Register a PATCH route.
   * @param path - Route pattern.
   * @param handlers - Optional middlewares followed by the terminal handler.
   */
  patch<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], DesoHandler<Path>]
  ): void {
    this.#register("PATCH" as HttpMethod, path, ...handlers);
  }

  /**
   * Register a DELETE route.
   * @param path - Route pattern.
   * @param handlers - Optional middlewares followed by the terminal handler.
   */
  delete<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], DesoHandler<Path>]
  ): void {
    this.#register("DELETE" as HttpMethod, path, ...handlers);
  }

  /**
   * Register a HEAD route.
   * @param path - Route pattern.
   * @param handlers - Optional middlewares followed by the terminal handler.
   */
  head<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], DesoHandler<Path>]
  ): void {
    this.#register("HEAD" as HttpMethod, path, ...handlers);
  }

  /**
   * Register an OPTIONS route.
   * @param path - Route pattern.
   * @param handlers - Optional middlewares followed by the terminal handler.
   */
  options<Path extends string>(
    path: Path,
    ...handlers: [...DesoMiddleware[], DesoHandler<Path>]
  ): void {
    this.#register("OPTIONS" as HttpMethod, path, ...handlers);
  }

  /**
   * Register a route that matches **all** HTTP methods (GET, POST, PUT,
   * PATCH, DELETE, HEAD, OPTIONS).
   * @param path - Route pattern.
   * @param handlers - Optional middlewares followed by the terminal handler.
   */
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

  /**
   * Register a WebSocket endpoint.
   *
   * Internally registers a GET route that uses `Deno.upgradeWebSocket`.
   *
   * @param path - Route pattern (e.g. `/ws/chat`).
   * @param handlers - Optional middlewares followed by `WsHandlers`.
   *
   * ```ts
   * app.ws("/ws/chat", {
   *   open(ws) { ws.send("connected"); },
   *   message(ws, ev) { ws.send(ev.data); },
   * });
   * ```
   */
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
