import { STATUS_CODE } from "./deps.ts";
import type { JSONValue, RouteParams, SearchParams } from "./types.ts";

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

  get store(): Map<string, unknown> {
    return this.#store;
  }

  req(): Request {
    return this.#request;
  }

  loadParams(params: RouteParams | SearchParams): this {
    for (const [key, value] of params) {
      this.#store.set(this.#paramPrefix + key, value);
    }
    return this;
  }

  param<T = string>(key: string): T | undefined {
    return this.#store.get(this.#paramPrefix + key) as T | undefined;
  }

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

  set<T = unknown>(key: string, value: T): void {
    this.#store.set(`ctx:${key}`, value);
  }

  get<T = unknown>(key: string): T | undefined {
    return this.#store.get(`ctx:${key}`) as T | undefined;
  }

  body(type: "json"): Promise<Record<string, unknown>>;
  body(type: "text"): Promise<string>;
  body(type: "form"): Promise<FormData>;
  async body(type: "json" | "text" | "form"): Promise<unknown> {
    if (type === "json") {
      return await this.#request.json().catch(() => ({}));
    } else if (type === "text") {
      return await this.#request.text();
    }
    return await this.#request.formData();
  }

  json(data: JSONValue, status: number = STATUS_CODE.OK): Response {
    return Response.json(data, this.#initWithHeaders({ status }));
  }

  html(value: string, status: number = STATUS_CODE.OK): Response {
    if (!this.#responseHeaders) {
      this.#responseHeaders = new Headers();
    }
    this.#responseHeaders.set("Content-Type", "text/html");
    return new Response(value, this.#initWithHeaders({ status }));
  }

  text(value: string, status: number = STATUS_CODE.OK): Response {
    return new Response(value, this.#initWithHeaders({ status }));
  }

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
