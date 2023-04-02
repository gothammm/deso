import { DesoHandler } from "./types.ts";

type RoutingCache<T = string> = Map<string, RoutingCache<T> | DesoHandler<T>>;

export type RouteParams = Map<string, unknown>;

type RouteMatchResult<Path extends string> = [
  Path,
  DesoHandler<Path> | undefined,
  RouteParams,
];

export class DesoRouter {
  #cache: RoutingCache = new Map<string, RoutingCache>();
  #HANDLER_KEY = "$_handler";

  add = <Path extends string>(path: Path, handler: DesoHandler<Path>) => {
    const routeParts = path.split("/").filter((i) => i !== "");
    return this.#addRoutePart<Path>(routeParts, handler, this.#cache);
  };
  match = (url: string): RouteMatchResult<string> => {
    const path = new URL(url).pathname;
    const routeParts = path.split("/").filter((part) => part !== "");
    const [handler, params] = this.#findMatch(routeParts, this.#cache);
    return [path, handler, params];
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
      // No idea how to fix this type.
      // deno-lint-ignore no-explicit-any
      return steppedCache.set(head, handlerRoutingCache as any);
    }

    const currentCacheLevel = steppedCache.get(head);

    const nextLevelRoutingCache = this.#addRoutePart<T>(
      rest,
      handler,
      (currentCacheLevel as RoutingCache) ?? new Map<string, RoutingCache>(),
    );

    return steppedCache.set(head, nextLevelRoutingCache);
  }
  #findMatch(
    routeParts: string[],
    steppedCache: RoutingCache,
    options?: {
      params: Map<string, unknown>;
    },
  ): [DesoHandler | undefined, RouteParams] {
    const [head, ...rest] = routeParts;
    const constructRouteMatchResult = (
      matchResult?: RoutingCache | DesoHandler,
    ): [DesoHandler | undefined, RouteParams] => {
      const params: RouteParams = options?.params ?? new Map();
      if (matchResult instanceof Map) {
        return rest.length <= 0
          ? [<DesoHandler> matchResult.get("$_handler"), params]
          : this.#findMatch(rest, matchResult, options);
      }
      return [matchResult, params];
    };
    if (!steppedCache.has(head)) {
      for (const [pattern, steppedCacheValue] of steppedCache) {
        const isParamPart = pattern.startsWith(":");
        const isRegexPart = pattern.startsWith("(");
        if (!isParamPart && !isRegexPart) {
          continue;
        }
        const regexStartIndex = pattern.indexOf("(");
        const regexEndIndex = pattern.lastIndexOf(")");
        const regexToCheck = regexStartIndex !== regexEndIndex &&
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
            regexStartIndex >= 0 ? regexStartIndex : pattern.length,
          );
          options = options ?? { params: new Map() };
          options.params.set(pathKey, head);
        }

        return constructRouteMatchResult(steppedCacheValue);
      }
    }
    return constructRouteMatchResult(steppedCache.get(head));
  }
}
