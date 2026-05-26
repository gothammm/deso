/**
 * Sliding-window rate limiter middleware.
 *
 * Tracks request counts per key (defaults to client IP via
 * `x-forwarded-for` / `x-real-ip`) within a configurable time window.
 * Returns 429 when a client exceeds the allowed maximum.
 * Sets standard `RateLimit-*` headers on every response.
 * @module
 */
import type { DesoMiddleware } from "../types.ts";

/** Options for the {@link rateLimiter} middleware. */
export interface RateLimiterOptions {
  /** Duration of the rate-limit window in milliseconds. */
  windowMs: number;
  /** Maximum number of requests allowed within the window. */
  max: number;
  /** Custom key function for grouping requests (default: client IP). */
  key?: (ctx: { req(): Request }) => string;
  /** Response body sent when the limit is exceeded (default: "Too many requests…"). */
  message?: string;
  /** HTTP status code for rate-limited responses (default 429). */
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

/**
 * Sliding-window rate limiter.
 *
 * Returns a middleware that counts requests per key within the configured
 * window and rejects excessive requests with a 429 response.
 *
 * @param options - Window duration, max requests, key function, etc.
 *
 * ```ts
 * app.use(rateLimiter({ windowMs: 60_000, max: 100 }));
 * ```
 */
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
