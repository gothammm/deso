import type { DesoHandler, HttpMethod, RouteMatchResult } from "./types.ts";

export class RouterRegistry extends Map {
  #patterns: URLPattern[];
  #cache: Map<string, RouteMatchResult>;
  #type: HttpMethod;
  constructor(type: HttpMethod) {
    super();
    this.#patterns = [];
    this.#cache = new Map();
    this.#type = type;
  }
  add(
    requestPath: string,
    data: { handler: DesoHandler; pattern: URLPattern }
  ) {
    this.set(requestPath, data);
    this.#patterns.push(data.pattern);
  }
  match(requestPath: string): RouteMatchResult | undefined {
    const cacheId = `${this.#type}:${requestPath}`;
    if (this.#cache.has(cacheId)) {
      return this.#cache.get(cacheId);
    }
    const pattern = this.#patterns.find((pattern) => pattern.exec(requestPath));
    if (!pattern) {
      return;
    }
    const routeMetadata = this.get(pattern.pathname);
    if (!routeMetadata) {
      return;
    }
    const result = {
      path: routeMetadata.requestPath,
      params: new Map(),
      handler: routeMetadata.handler as DesoHandler,
    };
    this.#cache.set(cacheId, result);
    return result;
  }
}
