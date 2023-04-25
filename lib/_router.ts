import type { DesoHandler, HttpMethod } from "./types.ts";
import { crawl } from "./util.ts";

type ResultNode<T = string> = {
  handler: DesoHandler<T>;
  routeHash: string;
};

type MatchResult<Path = string> = {
  node?: ResultNode<Path>;
  params?: Params;
};

type RoutingCache<T = string> = Map<string, RoutingCache<T> | ResultNode<T>>;

export type Params = Map<`${"PATH" | "SEARCH"}:${string}`, unknown>;

export class DesoRouter {
  #ROUTE_RESULT_NODE = "$_result_node";
  #cache: RoutingCache = new Map<string, RoutingCache>();
  #resultNodeCache = new Map<string, MatchResult>();
  on = <Path extends string>(
    method: HttpMethod,
    path: Path,
    handler: DesoHandler<Path>,
  ) => {
    this.#registerRoute(this.#routeParts(path, method), this.#cache, {
      handler: handler as unknown as DesoHandler<string>,
      routeHash: btoa(method + ":" + path),
    });
  };
  match = (url: string, method?: HttpMethod): MatchResult => {
    const requestPath = new URL(url).pathname;
    const routeParts = this.#routeParts(requestPath, method ?? "*");
    const cacheId = (method ?? "*") + ":" + requestPath;
    if (this.#resultNodeCache.has(cacheId)) {
      return this.#resultNodeCache.get(cacheId)!;
    }
    const params = new Map();
    const resultNode = this.#findRouteMatch(routeParts, this.#cache, params);

    const matchResult = {
      node: resultNode,
      params,
    };

    this.#resultNodeCache.set(cacheId, matchResult);
    return matchResult;
  };
  #routeParts(path: string, method: HttpMethod) {
    const parts = path
      .split("/")
      .filter((part) => part !== "")
      .map((token) => method + ":{" + token + "}");

    if (parts.length <= 0) {
      return [method + ":$"];
    }
    return parts;
  }
  #buildResult(
    matchResult: RoutingCache | ResultNode | undefined,
    params: Params,
    tokens: string[],
  ): ResultNode | undefined {
    if (!(matchResult instanceof Map)) {
      return matchResult;
    }
    if (matchResult.has(this.#ROUTE_RESULT_NODE) && tokens.length <= 0) {
      return matchResult.get(this.#ROUTE_RESULT_NODE) as ResultNode | undefined;
    }
    if (tokens.length <= 0) {
      return crawl(["*", this.#ROUTE_RESULT_NODE], matchResult) as ResultNode;
    }
    return this.#findRouteMatch(tokens, matchResult, params) as ResultNode;
  }
  #findRouteMatch(
    routeParts: string[],
    cache: RoutingCache,
    params: Params,
  ): ResultNode | undefined {
    const [head, ...rest] = routeParts;

    if (!cache.has(head)) {
      return this.#doPatternMatch(routeParts, cache, params);
    }

    const result = this.#buildResult(cache.get(head), params, rest);

    if (!result) {
      return this.#doPatternMatch(routeParts, cache, params);
    }
    return result;
  }
  #doPatternMatch(
    tokens: string[],
    cache: RoutingCache,
    params: Params,
  ): ResultNode | undefined {
    const [currentToken, ...nextTokens] = tokens;
    let result: ResultNode | undefined = undefined;
    const patternRegexChecker = new RegExp(
      /^(GET|PUT|PATCH|POST|DELETE|HEAD|\*):(\{:([\w-]+)(?:\(([^)]*)\))?\})$/i,
    );
    const paramValueRegex = new RegExp(/^(GET|PUT|HEAD|\*):(\{([\w-]+)\})$/i);
    for (const [pattern, steppedCacheValue] of cache) {
      if (!patternRegexChecker.test(pattern)) {
        continue;
      }

      const [, , , paramKey, paramRegex] = patternRegexChecker.exec(pattern) ??
        [];

      if (!paramKey) {
        continue;
      }
      const [, , , paramValue] = paramValueRegex.exec(currentToken) ?? [];

      if (paramRegex && !new RegExp(paramRegex).test(paramValue)) {
        continue;
      }
      params.set(`PATH:${paramKey}`, paramValue);
      result = this.#buildResult(steppedCacheValue, params, nextTokens);
      break;
    }
    return result;
  }
  #registerRoute(
    routerParts: string[],
    cache: RoutingCache,
    resultNode: ResultNode<string>,
  ): RoutingCache {
    const [head, ...rest] = routerParts;

    if (rest.length <= 0) {
      const resultNodeInCache: RoutingCache = new Map<
        string,
        ResultNode<string>
      >([[this.#ROUTE_RESULT_NODE, resultNode]]);
      if (cache.has(head)) {
        const currentNode = cache.get(head) as RoutingCache;
        const updatedCacheNode = new Map([
          ...currentNode,
          ...resultNodeInCache,
        ]);
        return cache.set(head, updatedCacheNode);
      }
      return cache.set(head, new Map([[this.#ROUTE_RESULT_NODE, resultNode]]));
    }

    const currentCacheLevel = cache.get(head);
    const nextLevelRoutingCache = this.#registerRoute(
      rest,
      (currentCacheLevel as RoutingCache) ?? new Map(),
      resultNode,
    );
    return cache.set(head, nextLevelRoutingCache);
  }
}
