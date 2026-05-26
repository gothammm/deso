/**
 * Request/response logging middleware.
 *
 * Supports plain-text and JSON output formats. Can exclude specific
 * paths (e.g. health checks) from logging. Pairs well with the
 * `requestId` middleware for request correlation.
 * @module
 */
import type { DesoMiddleware } from "../types.ts";

/** Options for the {@link logger} middleware. */
export interface LoggerOptions {
  /** Output format: `"text"` (default) or `"json"`. */
  format?: "text" | "json";
  /** Output writer (defaults to `Deno.stdout`). */
  writer?: { write: (bytes: Uint8Array) => number };
  /** Paths to exclude from logging (e.g. `["/health"]`). */
  excludePaths?: string[];
}

const encoder = new TextEncoder();

/**
 * Request/response logging middleware.
 *
 * Logs every request with method, path, status code, and duration. In
 * `"json"` mode the output is a JSON object per line, compatible with
 * structured-logging pipelines.
 *
 * @param options - Log format, writer, and exclusion list.
 *
 * ```ts
 * app.use(logger({ format: "json", excludePaths: ["/health"] }));
 * ```
 */
export function logger(options: LoggerOptions = {}): DesoMiddleware {
  const writer = options.writer ?? Deno.stdout;
  const format = options.format ?? "text";
  const exclude = new Set(options.excludePaths ?? []);

  return async (context, next) => {
    const request = context.req();
    const url = new URL(request.url);

    if (exclude.has(url.pathname)) {
      return next();
    }

    const start = Date.now();
    const requestId = context.get<string>("x-request-id") ??
      crypto.randomUUID();

    try {
      const response = await next();
      const duration = Date.now() - start;

      if (format === "json") {
        const data = {
          time: new Date().toISOString(),
          method: request.method,
          path: url.pathname,
          status: response.status,
          duration,
          requestId,
        };
        writer.write(encoder.encode(JSON.stringify(data)));
        writer.write(encoder.encode("\n"));
      } else {
        const line =
          `${request.method} ${url.pathname} ${response.status} ${duration}ms\n`;
        writer.write(encoder.encode(line));
      }

      return response;
    } catch (error) {
      const duration = Date.now() - start;

      if (format === "json") {
        const data = {
          time: new Date().toISOString(),
          method: request.method,
          path: url.pathname,
          status: 500,
          duration,
          requestId,
          error: error instanceof Error ? error.message : String(error),
        };
        writer.write(encoder.encode(JSON.stringify(data)));
        writer.write(encoder.encode("\n"));
      } else {
        const line = `${request.method} ${url.pathname} ERROR ${duration}ms\n`;
        writer.write(encoder.encode(line));
      }

      throw error;
    }
  };
}
