import type { DesoMiddleware } from "../types.ts";

export interface BodyLimitOptions {
  maxSize: number;
  errorMessage?: string;
}

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
