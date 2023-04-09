import type { DesoHandler } from "./types.ts";

type RoutingCache<T = string> = Map<string, RoutingCache<T> | DesoHandler<T>>;

export type RouteParams = Map<string, unknown>;

export type PathPattern = string;

type RouteMatchResult<Path extends string> = [
  Path,
  DesoHandler<Path> | undefined,
  RouteParams,
  PathPattern
];

export class DesoRouter {
  #cache: RoutingCache = new Map<string, RoutingCache>();
  #HANDLER_KEY = "$_handler";
  #resultCache = new Map<string, RouteMatchResult<string>>();
  add = <Path extends string>(path: Path, handler: DesoHandler<Path>) => {
    const routeParts = path.split("/").filter((i) => i !== "");
    return this.#addRoutePart<Path>(routeParts.length <= 0 ? ["/"] : routeParts, handler, this.#cache);
  };
  match = (url: string): RouteMatchResult<string> => {
    const path = new URL(url).pathname;
    if (this.#resultCache.has(path)) {
      return this.#resultCache.get(path)!;
    }
    const routeParts = path.split("/").filter((part) => part !== "");
    const [handler, params, pathPattern] = this.#findMatch(
      routeParts.length <= 0 ? ["/"] : routeParts,
      this.#cache,
      { params: new Map(), path: "" }
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
    steppedCache: RoutingCache
  ): RoutingCache {
    const [head, ...rest] = routeParts;
    if (rest.length <= 0) {
      const handlerRoutingCache: RoutingCache<T> = new Map<
        string,
        DesoHandler<T>
      >();
      handlerRoutingCache.set(this.#HANDLER_KEY, handler);
      const resultNode = steppedCache.has(head)
        // deno-lint-ignore no-explicit-any
        ? new Map([...(steppedCache.get(head) as any), ...handlerRoutingCache])
        : handlerRoutingCache;

      return steppedCache.set(head, resultNode as RoutingCache);
    }

    const currentCacheLevel = steppedCache.get(head);

    const nextLevelRoutingCache = this.#addRoutePart<T>(
      rest,
      handler,
      (currentCacheLevel as RoutingCache) ?? new Map<string, RoutingCache>()
    );

    return steppedCache.set(head, nextLevelRoutingCache);
  }
  #findMatch(
    routeParts: string[],
    steppedCache: RoutingCache,
    options: {
      params: Map<string, unknown>;
      path: string;
    }
  ): [DesoHandler | undefined, RouteParams, PathPattern] {
    const [head, ...rest] = routeParts;
    const constructRouteMatchResult = (
      matchResult?: RoutingCache | DesoHandler
    ): [DesoHandler | undefined, RouteParams, PathPattern] => {
      const params: RouteParams = options?.params ?? new Map();
      const pathPattern: PathPattern = options?.path ?? ("" as PathPattern);
      if (matchResult instanceof Map) {
        return rest.length <= 0
          ? [<DesoHandler>matchResult.get("$_handler"), params, pathPattern]
          : this.#findMatch(rest, matchResult, options);
      }
      return [matchResult, params, pathPattern];
    };
    if (!steppedCache.has(head)) {
      for (const [pattern, steppedCacheValue] of steppedCache) {
        console.log(steppedCache);
        const isParamPart = pattern.startsWith(":");
        const isRegexPart = pattern.startsWith("(");
        if (!isParamPart && !isRegexPart) {
          continue;
        }
        const regexStartIndex = pattern.indexOf("(");
        const regexEndIndex = pattern.lastIndexOf(")");
        const regexToCheck =
          regexStartIndex !== regexEndIndex &&
          regexStartIndex >= 0 &&
          regexEndIndex > 0
            ? pattern.slice(regexStartIndex + 1, regexEndIndex)
            : undefined;
        if (regexToCheck && !new RegExp(regexToCheck).test(head)) {
          continue;
        }
        if (isParamPart) {
          const pathKey = pattern.slice(
            1,
            regexStartIndex >= 0 ? regexStartIndex : pattern.length
          );
          options.params.set(pathKey, head);
        }
        options.path += `/${pattern}`;
        return constructRouteMatchResult(steppedCacheValue);
      }
    }
    options.path += `/${head}`;
    return constructRouteMatchResult(steppedCache.get(head));
  }
}
