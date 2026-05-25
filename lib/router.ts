import type { DesoHandler, RouteParams } from "./types.ts";

type RouteMatchResult<Path extends string> = [
  DesoHandler<Path> | undefined,
  RouteParams,
  string,
];

type RouteOptions = { params: Map<string, unknown>; path: string };

export class DesoRouter {
  #trie = new Map<string, unknown>();
  #handlerKey = "$_handler";
  #paramPattern = /^:([\w-]+)(?:\(([^)]*)\))?$/;
  #matchCache = new Map<string, RouteMatchResult<string>>();
  #maxCacheSize: number;

  constructor(maxCacheSize = 1000) {
    this.#maxCacheSize = maxCacheSize;
  }

  add(path: string, handler: DesoHandler): void {
    const parts = path.split("/").filter(Boolean);
    this.#insert(parts.length === 0 ? ["$"] : parts, handler, this.#trie);
  }

  match(path: string): RouteMatchResult<string> {
    const cached = this.#matchCache.get(path);
    if (cached) return cached;

    const parts = path.split("/").filter(Boolean);
    const result = this.#search(
      parts.length === 0 ? ["$"] : parts,
      this.#trie,
      {
        params: new Map(),
        path: "",
      },
    );

    this.#cacheResult(path, result);
    return result;
  }

  #cacheResult(path: string, result: RouteMatchResult<string>): void {
    if (this.#matchCache.size >= this.#maxCacheSize) {
      const key = this.#matchCache.keys().next().value;
      if (key !== undefined) {
        this.#matchCache.delete(key);
      }
    }
    this.#matchCache.set(path, result);
  }

  #insert(
    parts: string[],
    handler: DesoHandler,
    node: Map<string, unknown>,
  ): void {
    const [head, ...rest] = parts;
    if (rest.length === 0) {
      const existing = node.get(head) as Map<string, unknown> | undefined;
      const newNode = existing ?? new Map<string, unknown>();
      (newNode as Map<string, unknown>).set(this.#handlerKey, handler);
      node.set(head, newNode);
      return;
    }
    const child = (node.get(head) as Map<string, unknown> | undefined) ??
      new Map<string, unknown>();
    this.#insert(rest, handler, child);
    node.set(head, child);
  }

  #search(
    parts: string[],
    node: Map<string, unknown>,
    ctx: RouteOptions,
  ): RouteMatchResult<string> {
    const [head, ...rest] = parts;

    const exactChild = node.get(head);
    if (exactChild) {
      const result = this.#descend(exactChild, rest, {
        ...ctx,
        path: `${ctx.path}/${head}`,
      });
      if (result[0]) return result;
    }

    for (const [key, child] of node) {
      const m = this.#paramPattern.exec(key);
      if (!m) continue;
      const [, paramName, regex] = m;
      if (!paramName) continue;
      if (regex && !new RegExp(`^${regex}$`).test(head)) continue;

      const params = new Map(ctx.params);
      params.set(paramName, head);
      const result = this.#descend(child, rest, {
        params,
        path: `${ctx.path}/${key}`,
      });
      if (result[0]) return result;
    }

    if (node.has("*")) {
      const wildcardEntry = node.get("*") as Map<string, unknown>;
      const handler = wildcardEntry.get(this.#handlerKey) as DesoHandler;
      if (handler) {
        return [handler, ctx.params, `${ctx.path}/*`];
      }
    }

    return [undefined, new Map(), ""];
  }

  #descend(
    child: unknown,
    remaining: string[],
    ctx: RouteOptions,
  ): RouteMatchResult<string> {
    if (child instanceof Map) {
      if (remaining.length === 0) {
        const handler = child.get(this.#handlerKey) as DesoHandler | undefined;
        if (handler) return [handler, ctx.params, ctx.path];
        if (child.has("*")) {
          return [child.get("*") as DesoHandler, ctx.params, ctx.path];
        }
        return [undefined, new Map(), ""];
      }
      return this.#search(remaining, child, ctx);
    }
    return [child as DesoHandler, ctx.params, ctx.path];
  }
}
