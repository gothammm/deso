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
  add<T extends string>(
    requestPath: string,
    data: { handler: DesoHandler<T>; pattern: URLPattern }
  ) {
    this.set(requestPath, data);
    this.#patterns.push(data.pattern);
  }
  match(requestPath: string): RouteMatchResult | undefined {
    const cacheId = `${this.#type}:${requestPath}`;
    if (this.#cache.has(cacheId)) {
      return this.#cache.get(cacheId);
    }
    const pattern = (() => {
      for(const pattern of this.#patterns) {
        const patternMatch = pattern.exec(requestPath);
        if (!patternMatch) {
          continue;
        }
        return { patternMatch, patternPath: pattern.pathname };
      }
    })();

    if (!pattern) {
      return;
    }
    const routeMetadata = this.get(pattern.patternPath);
    if (!routeMetadata) {
      return;
    }
    const patternMatch = pattern.patternMatch;
    const queryParams = new Map(Object.entries(patternMatch.pathname.groups ?? {}));
    // const searchParams = this.#buildSearchParams(patternMatch);
    const result = {
      path: patternMatch.pathname.input,
      params: { ...Object.fromEntries(queryParams) },// new Map([...queryParams, ...searchParams]),
      handler: routeMetadata.handler as DesoHandler,
    };
    this.#cache.set(cacheId, result);
    return result;
  }
  #buildSearchParams(patternResult: URLPatternResult) {
    const searchParams = patternResult.search.groups ?? {};
    return Object.entries(searchParams).reduce((accumulator, current) => {
      const [_, value] = current;
      if (!value.includes("=")) {
        return accumulator.set(value, true);
      }
      const [paramKey, paramValue] = value.split('=');
      return accumulator.set(paramKey, paramValue);
    }, new Map());
  }
}
