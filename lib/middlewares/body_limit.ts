/**
 * Request body size limiter middleware.
 *
 * Checks the `Content-Length` header against a configured maximum and
 * returns a 413 response when the payload exceeds the limit.
 * @module
 */
import type { DesoMiddleware } from "../types.ts";

/** Options for the {@link bodyLimit} middleware. */
export interface BodyLimitOptions {
  /** Maximum allowed body size in bytes. */
  maxSize: number;
  /** Custom error message returned in the 413 response (default: "Request body too large"). */
  errorMessage?: string;
}

/**
 * Middleware that rejects requests whose `Content-Length` exceeds the
 * configured maximum. Returns a 413 (Payload Too Large) response.
 *
 * @param options - Configuration including `maxSize` (bytes).
 *
 * ```ts
 * app.use(bodyLimit({ maxSize: 1024 * 1024 }));
 * ```
 */
export function bodyLimit(options: BodyLimitOptions): DesoMiddleware {
  const maxSize = options.maxSize;
  const errorMessage = options.errorMessage ?? "Request body too large";

  return (context, next) => {
    const request = context.req();
    const contentLength = request.headers.get("content-length");

    if (contentLength) {
      const size = parseInt(contentLength, 10);
      if (!Number.isNaN(size) && size > maxSize) {
        return context.text(errorMessage, 413);
      }
    }

    return next();
  };
}
