import type { DesoMiddleware } from "../types.ts";

export interface TimeoutOptions {
  duration: number;
  errorMessage?: string;
}

export function timeout(options: TimeoutOptions): DesoMiddleware {
  const duration = options.duration;
  const errorMessage = options.errorMessage ?? "Request timed out";

  return async (_context, next) => {
    const result = await Promise.race([
      next(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), duration)
      ),
    ]);
    return result;
  };
}
