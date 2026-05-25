import type { DesoMiddleware } from "../types.ts";

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  key?: (ctx: { req(): Request }) => string;
  message?: string;
  statusCode?: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

const SECOND = 1000;

const defaultKey = (ctx: { req(): Request }): string => {
  const req = ctx.req();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
};

const addHeaders = (
  response: Response,
  max: number,
  remaining: number,
  resetAt: number,
  retryAfter?: number,
): Response => {
  const headers = new Headers(response.headers);
  headers.set("RateLimit-Limit", String(max));
  headers.set("RateLimit-Remaining", String(Math.max(0, remaining)));
  headers.set("RateLimit-Reset", String(Math.ceil(resetAt / SECOND)));
  if (retryAfter !== undefined) {
    headers.set("Retry-After", String(retryAfter));
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const rateLimiter = (options: RateLimiterOptions): DesoMiddleware => {
  const windowMs = options.windowMs;
  const max = options.max;
  const getKey = options.key ?? defaultKey;
  const message = options.message ??
    "Too many requests, please try again later";
  const statusCode = options.statusCode ?? 429;
  const store = new Map<string, Entry>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, windowMs);

  return async (ctx, next) => {
    const key = getKey(ctx as Parameters<typeof defaultKey>[0]);
    const now = Date.now();
    const existing = store.get(key);

    if (!existing || existing.resetAt <= now) {
      const entry: Entry = { count: 1, resetAt: now + windowMs };
      store.set(key, entry);
      const response = await next();
      return addHeaders(response, max, max - 1, entry.resetAt);
    }

    const updated: Entry = {
      count: existing.count + 1,
      resetAt: existing.resetAt,
    };
    store.set(key, updated);

    const remaining = max - updated.count;

    if (remaining < 0) {
      const resetAt = updated.resetAt;
      const retryAfter = Math.ceil((resetAt - now) / SECOND);
      const body = message;
      const response = new Response(body, { status: statusCode });
      return addHeaders(response, max, 0, resetAt, retryAfter);
    }

    const response = await next();
    return addHeaders(response, max, remaining, updated.resetAt);
  };
};
