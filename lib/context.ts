import { HttpStatus } from "./deps.ts";
import type { RouteParams, SearchParams } from "./types.ts";
import {
  ClientErrorStatusCode,
  JSONValue,
  ParamKeys,
  ServerErrorStatusCode,
} from "./types.ts";

export class DesoContext<Path = string> {
  #baseRequest: Request;
  #store: Map<string, unknown>;
  #PARAM_KEY = "params:";
  #REQ_CONTEXT_KEY = "req:context:";
  #responseHeaders?: Headers;
  constructor(
    request: Request,
    options?: {
      routeParams?: RouteParams;
      contextStorage?: Map<string, unknown>;
    },
  ) {
    this.#baseRequest = request;
    this.#store = options?.contextStorage ?? new Map<string, unknown>();
    if (options?.routeParams) {
      this.loadParams(options.routeParams);
    }
  }
  loadParams = (params: RouteParams | SearchParams) => {
    for (const [key, value] of params) {
      this.#store.set(this.#PARAM_KEY + key, value);
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
  json = (data: JSONValue, status: HttpStatus = HttpStatus.OK): Response => {
    return Response.json(
      data,
      Object.assign(this.#responseInit ?? {}, { status }),
    );
  };
  html = (value: string, status: HttpStatus = HttpStatus.OK): Response => {
    if (!this.#responseHeaders) {
      this.#responseHeaders = new Headers();
    }
    this.#responseHeaders?.set("Content-Type", "text/html");
    return new Response(
      value,
      Object.assign(this.#responseInit ?? {}, { status }),
    );
  };
  text = (value: string, status: HttpStatus = HttpStatus.OK): Response =>
    new Response(value, Object.assign(this.#responseInit ?? {}, { status }));
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
  set = <V = unknown>(key: string, value: V): void => {
    this.#store.set(this.#REQ_CONTEXT_KEY + key, value);
  };
  get = <V = unknown>(key: string): V | undefined =>
    (this.#store.get(this.#REQ_CONTEXT_KEY + key) as V) ?? undefined;
  get #responseInit() {
    return this.#responseHeaders
      ? { headers: this.#responseHeaders }
      : undefined;
  }
}
