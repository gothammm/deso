/**
 * Health-check middleware.
 *
 * Intercepts requests to a configurable path, runs a set of named
 * asynchronous checks, and returns a 200/503 JSON response summarising
 * the health of the application and its dependencies.
 * @module
 */
import type { DesoMiddleware } from "../types.ts";

/** A single health check definition. */
export interface HealthCheck {
  /** Human-readable name for the check (e.g. `"database"`). */
  name: string;
  /** Async or sync function returning `true` if healthy, `false` otherwise. */
  check: () => Promise<boolean> | boolean;
}

/** Options for the {@link health} middleware. */
export interface HealthOptions {
  /** URL path for the health endpoint (default `"/health"`). */
  path?: string;
  /** List of health checks to run on each request. */
  checks?: HealthCheck[];
}

/**
 * Health-check middleware.
 *
 * Intercepts requests to the configured health path, runs all registered
 * checks concurrently, and responds with a JSON summary:
 * - `200 {"status": "healthy", "checks": […]}` — all checks pass.
 * - `503 {"status": "unhealthy", "checks": […]}` — one or more checks fail.
 *
 * @param options - Path and check-list configuration.
 *
 * ```ts
 * app.use(health({
 *   checks: [
 *     { name: "memory", check: () => Deno.memoryUsage().heapUsed < 500e6 },
 *   ],
 * }));
 * ```
 */
export function health(options: HealthOptions = {}): DesoMiddleware {
  const path = options.path ?? "/health";
  const checks = options.checks ?? [];

  return async (context, next) => {
    const request = context.req();
    const url = new URL(request.url);

    if (url.pathname !== path) {
      return next();
    }

    const results = await Promise.all(
      checks.map(async (c) => {
        try {
          const ok = await c.check();
          return { name: c.name, status: ok ? "pass" : "fail" };
        } catch {
          return { name: c.name, status: "fail" };
        }
      }),
    );

    const status = results.every((r) => r.status === "pass") ? 200 : 503;
    const payload = {
      status: status === 200 ? "healthy" : "unhealthy",
      checks: results,
    };

    return context.json(payload, status);
  };
}
