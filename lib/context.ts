/**
 * Request context that flows through the middleware chain.
 *
 * Wraps the incoming `Request` and provides helpers for reading params,
 * query strings, headers, and request bodies, as well as writing
 * responses (`json`, `text`, `html`, `stream`, `oops`).
 * @module
 */
import { STATUS_CODE } from "./deps.ts";
import type { JSONValue, RouteParams, SearchParams } from "./types.ts";

/**
 * Wraps an HTTP request with convenience methods for reading input and
 * producing responses throughout the middleware chain.
 *
 * @template Path - The route pattern string (used for type-safe params).
 */
export class DesoContext<_Path = string> {
  #request: Request;
  #store: Map<string, unknown>;
  #responseHeaders?: Headers;
  #paramPrefix = "p:";

  constructor(
    request: Request,
    options?: {
      routeParams?: RouteParams;
      contextStorage?: Map<string, unknown>;
    },
  ) {
    this.#request = request;
    this.#store = options?.contextStorage ?? new Map<string, unknown>();
    if (options?.routeParams) {
      for (const [key, value] of options.routeParams) {
        this.#store.set(this.#paramPrefix + key, value);
      }
    }
  }

  /** The internal key-value store shared across middlewares for this request. */
  get store(): Map<string, unknown> {
    return this.#store;
  }

  /** Returns the original incoming {@link Request}. */
  req(): Request {
    return this.#request;
  }

  /**
   * Load route or search parameters into the context store.
   * Each key is prefixed internally to avoid collisions.
   * @returns `this` for chaining.
   */
  loadParams(params: RouteParams | SearchParams): this {
    for (const [key, value] of params) {
      this.#store.set(this.#paramPrefix + key, value);
    }
    return this;
  }

  /**
   * Retrieve a route parameter by name.
   * @param key - The parameter name (without `:` prefix).
   * @returns The parameter value, or `undefined` if not found.
   */
  param<T = string>(key: string): T | undefined {
    return this.#store.get(this.#paramPrefix + key) as T | undefined;
  }

  /**
   * Retrieve a query-string parameter by name.
   * @param key - The query parameter name.
   * @returns The first value, or `undefined` if absent.
   */
  query<T = string>(key: string): T | undefined {
    const url = new URL(this.#request.url);
    const value = url.searchParams.get(key);
    return (value ?? undefined) as T | undefined;
  }

  header(key: string): string | undefined;
  header(key: string, value: string, options?: { append: boolean }): void;
  header(
    key: string,
    value?: string,
    options?: { append: boolean },
  ): string | undefined | undefined {
    if (value === undefined) {
      return this.#request.headers.get(key) ?? undefined;
    }
    if (!this.#responseHeaders) {
      this.#responseHeaders = new Headers();
    }
    if (options?.append) {
      this.#responseHeaders.append(key, value);
    } else {
      this.#responseHeaders.set(key, value);
    }
  }

  /**
   * Store an arbitrary value on the context for downstream middlewares.
   * @param key - Storage key (namespaced internally).
   * @param value - Any value to store.
   */
  set<T = unknown>(key: string, value: T): void {
    this.#store.set(`ctx:${key}`, value);
  }

  /**
   * Retrieve a previously-stored context value.
   * @param key - Storage key.
   * @returns The stored value, or `undefined`.
   */
  get<T = unknown>(key: string): T | undefined {
    return this.#store.get(`ctx:${key}`) as T | undefined;
  }

  /**
   * Parse the request body as JSON and return a plain object.
   * Returns an empty object `{}` on parse failure.
   */
  body(type: "json"): Promise<Record<string, unknown>>;
  /** Read the request body as a plain text string. */
  body(type: "text"): Promise<string>;
  /** Parse the request body as `FormData`. */
  body(type: "form"): Promise<FormData>;
  async body(type: "json" | "text" | "form"): Promise<unknown> {
    if (type === "json") {
      return await this.#request.json().catch(() => ({}));
    } else if (type === "text") {
      return await this.#request.text();
    }
    return await this.#request.formData();
  }

  /**
   * Return a JSON response with the given data and status code.
   * @param data - A JSON-serializable value.
   * @param status - HTTP status code (default 200).
   */
  json(data: JSONValue, status: number = STATUS_CODE.OK): Response {
    return Response.json(data, this.#initWithHeaders({ status }));
  }

  /**
   * Return an HTML response with `Content-Type: text/html`.
   * @param value - The HTML string.
   * @param status - HTTP status code (default 200).
   */
  html(value: string, status: number = STATUS_CODE.OK): Response {
    if (!this.#responseHeaders) {
      this.#responseHeaders = new Headers();
    }
    this.#responseHeaders.set("Content-Type", "text/html");
    return new Response(value, this.#initWithHeaders({ status }));
  }

  /**
   * Return a plain-text response.
   * @param value - The text body.
   * @param status - HTTP status code (default 200).
   */
  text(value: string, status: number = STATUS_CODE.OK): Response {
    return new Response(value, this.#initWithHeaders({ status }));
  }

  /**
   * Return a streaming response with a custom content type.
   * @param readable - A `ReadableStream` to pipe as the body.
   * @param status - HTTP status code (default 200).
   * @param contentType - MIME type (default `application/octet-stream`).
   */
  stream(
    readable: ReadableStream,
    status: number = STATUS_CODE.OK,
    contentType = "application/octet-stream",
  ): Response {
    if (!this.#responseHeaders) {
      this.#responseHeaders = new Headers();
    }
    this.#responseHeaders.set("Content-Type", contentType);
    return new Response(readable, this.#initWithHeaders({ status }));
  }

  /**
   * Return an error response.
   *
   * Accepts a plain string, a `JSONValue`, or an `Error` instance. If the
   * value is an `Error` with a numeric `.status` property that code is used;
   * otherwise the explicit `status` argument applies.
   *
   * @param value - Error message, JSON payload, or Error instance.
   * @param status - Fallback HTTP status (default 500).
   */
  oops(
    value: string | JSONValue | Error,
    status: number = STATUS_CODE.InternalServerError,
  ): Response {
    const resolvedStatus = value instanceof Error && "status" in value
      ? (value as Error & { status: number }).status
      : status;

    if (value instanceof Error) {
      return new Response(
        value.message,
        this.#initWithHeaders({
          status: resolvedStatus,
        }),
      );
    }
    if (typeof value === "string") {
      return new Response(
        value,
        this.#initWithHeaders({
          status: resolvedStatus,
        }),
      );
    }
    return Response.json(
      value,
      this.#initWithHeaders({
        status: resolvedStatus,
      }),
    );
  }

  #initWithHeaders(init: ResponseInit): ResponseInit {
    return this.#responseHeaders
      ? { ...init, headers: this.#responseHeaders }
      : init;
  }
}
