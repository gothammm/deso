import type { DesoHandler } from "./types.ts";
import { crawl } from "./util.ts";

type RoutingCache<T = string> = Map<string, RoutingCache<T> | DesoHandler<T>>;

type RouteOptions = { params: Map<string, unknown>; path: string };

export type RouteParams = Map<string, unknown>;

export type PathPattern = string;

type RouteMatchResult<Path extends string> = [
  Path,
  DesoHandler<Path> | undefined,
  RouteParams,
  PathPattern,
];

export class DesoRouter {
  #cache: RoutingCache = new Map<string, RoutingCache>();
  #HANDLER_KEY = "$_handler";
  #patternRegex = /^(:([\w-]+)(?:\(([^)]*)\))?)$/i;
  #resultCache = new Map<string, RouteMatchResult<string>>();
  add = <Path extends string>(path: Path, handler: DesoHandler<Path>) => {
    const routeParts = path.split("/").filter((i) => i !== "");
    return this.#addRoutePart<Path>(
      routeParts.length <= 0 ? ["$"] : routeParts,
      handler,
      this.#cache,
    );
  };
  match = (url: string): RouteMatchResult<string> => {
    const path = new URL(url).pathname;
    if (this.#resultCache.has(path)) {
      return this.#resultCache.get(path)!;
    }
    const routeParts = path.split("/").filter((part) => part !== "");
    const [handler, params, pathPattern] = this.#findMatch(
      routeParts.length <= 0 ? ["$"] : routeParts,
      this.#cache,
      { params: new Map(), path: "" },
    );
    const result = [
      path,
      handler,
      params,
      pathPattern,
    ] as RouteMatchResult<string>;
    this.#resultCache.set(path, result);
    return result;
  };
  #addRoutePart<T extends string>(
    routeParts: string[],
    handler: DesoHandler<T>,
    steppedCache: RoutingCache,
  ): RoutingCache {
    const [head, ...rest] = routeParts;
    if (rest.length <= 0) {
      const handlerRoutingCache: RoutingCache<T> = new Map<
        string,
        DesoHandler<T>
      >();
      handlerRoutingCache.set(this.#HANDLER_KEY, handler);
      const resultNode = steppedCache.has(head) // deno-lint-ignore no-explicit-any
        ? new Map([...(steppedCache.get(head) as any), ...handlerRoutingCache])
        : handlerRoutingCache;

      return steppedCache.set(head, resultNode as RoutingCache);
    }

    const currentCacheLevel = steppedCache.get(head);

    const nextLevelRoutingCache = this.#addRoutePart<T>(
      rest,
      handler,
      (currentCacheLevel as RoutingCache) ?? new Map<string, RoutingCache>(),
    );

    return steppedCache.set(head, nextLevelRoutingCache);
  }
  #constructRouteMatchResult = (
    matchResult: RoutingCache | DesoHandler | undefined,
    tokens: string[],
    options: RouteOptions,
  ): [DesoHandler | undefined, RouteParams, PathPattern] => {
    const params: RouteParams = options?.params ?? new Map();
    const pathPattern: PathPattern = options?.path ?? ("" as PathPattern);
    if (matchResult instanceof Map) {
      return tokens.length <= 0
        ? [
          <DesoHandler> matchResult.get("$_handler") ??
            crawl(["*", "$_handler"], matchResult),
          params,
          pathPattern,
        ]
        : this.#findMatch(tokens, matchResult, options);
    }
    return [matchResult, params, pathPattern];
  };
  #findMatch(
    routeParts: string[],
    steppedCache: RoutingCache,
    options: {
      params: Map<string, unknown>;
      path: string;
    },
  ): [DesoHandler | undefined, RouteParams, PathPattern] {
    const [head, ...rest] = routeParts;
    if (!steppedCache.has(head)) {
      return this.#findByPatternToken(steppedCache, head, rest, options);
    }
    options.path += "/" + head;
    const result = this.#constructRouteMatchResult(
      steppedCache.get(head),
      rest,
      options,
    );
    if (!result[0]) {
      return this.#findByPatternToken(steppedCache, head, rest, options);
    }
    return result;
  }
  #findByPatternToken(
    steppedCache: RoutingCache,
    currentToken: string,
    nextTokens: string[],
    options: RouteOptions,
  ) {
    let result: [DesoHandler | undefined, RouteParams, PathPattern] = [
      undefined,
      new Map(),
      "",
    ];
    const patternRegexChecker = this.#patternRegex;

    for (const [pattern, steppedCacheValue] of steppedCache) {
      if (!patternRegexChecker.test(pattern)) {
        continue;
      }

      const [, , paramKey, paramRegex] = patternRegexChecker.exec(pattern) ??
        [];

      if (!paramKey) {
        continue;
      }

      if (paramRegex && !new RegExp(paramRegex).test(currentToken)) {
        continue;
      }
      options.params.set(paramKey, currentToken);
      options.path += "/" + pattern;
      result = this.#constructRouteMatchResult(
        steppedCacheValue,
        nextTokens,
        options,
      );
      break;
    }
    return result;
  }
}
