import type { DesoMiddleware } from "../types.ts";

export interface HealthCheck {
  name: string;
  check: () => Promise<boolean> | boolean;
}

export interface HealthOptions {
  path?: string;
  checks?: HealthCheck[];
}

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
