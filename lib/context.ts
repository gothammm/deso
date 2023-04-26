import type { ConnInfo } from "./deps.ts";
import type { RouteParams } from "./router.ts";
import {
  ClientErrorStatusCode,
  JSONValue,
  ParamKeys,
  ServerErrorStatusCode,
} from "./types.ts";

export class DesoContext<Path = string> {
  #baseRequest: Request;
  #store: Map<string, unknown>;
  #responseHeaders?: Headers;
  #connection: ConnInfo;
  constructor(
    request: Request,
    conn: ConnInfo,
    options?: { routeParams: RouteParams },
  ) {
    this.#baseRequest = request;
    this.#connection = conn;
    this.#store = new Map<string, unknown>();
    if (options?.routeParams) {
      this.loadParams(options.routeParams);
    }
  }
  get connection() {
    return this.#connection;
  }
  loadParams = (params: RouteParams) => {
    for (const [key, value] of params) {
      this.#store.set("params:" + key, value);
    }
    return this;
  };
  get store() {
    return this.#store;
  }
  req = (): Request => this.#baseRequest;
  param = <T extends unknown>(key: ParamKeys<Path>): T | undefined => {
    const paramValue = this.#store.get("params:" + key);
    return (paramValue as T) ?? undefined;
  };
  async body(type: "json"): Promise<Record<string, unknown>>;
  async body(type: "text"): Promise<string>;
  async body(type: "form"): Promise<FormData>;
  async body(type: "json" | "text" | "form") {
    const incomingRequest = this.#baseRequest;
    if (type === "json") {
      return await incomingRequest.json().catch(() => ({}));
    } else if (type === "text") {
      return await incomingRequest.text();
    }
    return await incomingRequest.formData();
  }
  json = (data: JSONValue): Response => {
    return Response.json(data, this.#responseInit);
  };
  html = (value: string): Response => {
    if (!this.#responseHeaders) {
      this.#responseHeaders = new Headers();
    }
    this.#responseHeaders?.set("Content-Type", "text/html");
    return new Response(value, this.#responseInit);
  };
  text = (value: string): Response => new Response(value, this.#responseInit);
  oops = (
    value: string | JSONValue | Error,
    status: ClientErrorStatusCode | ServerErrorStatusCode,
  ) => {
    if (value instanceof Error) {
      return new Response(
        value.message,
        Object.assign(this.#responseInit ?? {}, { status }),
      );
    }
    if (typeof value === "string") {
      return new Response(
        value,
        Object.assign(this.#responseInit ?? {}, { status }),
      );
    }
    return Response.json(
      value,
      Object.assign(this.#responseInit ?? {}, { status }),
    );
  };
  header(key: string): string | undefined;
  header(key: string, value: string, options?: { append: boolean }): Headers;
  header(
    key: string,
    value?: string,
    options?: { append: boolean },
  ): string | undefined | Headers {
    if (!value) {
      return this.#baseRequest.headers.get(key) ?? undefined;
    }
    this.#responseHeaders = new Headers();
    if (options?.append) {
      this.#responseHeaders.append(key, value);
    } else {
      this.#responseHeaders.set(key, value);
    }
    return this.#responseHeaders;
  }
  set = (key: string, value: unknown): void => {
    this.#store.set(`req:context:${key}`, value);
  };
  get = <K extends string, V = unknown>(key: K): V | undefined =>
    (this.#store.get(`req:context:${key}`) as V) ?? undefined;
  get #responseInit() {
    return this.#responseHeaders
      ? { headers: this.#responseHeaders }
      : undefined;
  }
}
