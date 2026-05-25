import type { DesoMiddleware } from "../types.ts";

export interface LoggerOptions {
  format?: string;
  writer?: { write: (bytes: Uint8Array) => number };
}

const encoder = new TextEncoder();

export function logger(options: LoggerOptions = {}): DesoMiddleware {
  const writer = options.writer ?? Deno.stdout;

  return async (context, next) => {
    const start = Date.now();
    const request = context.req();

    try {
      const response = await next();
      const duration = Date.now() - start;
      const line = `${request.method} ${
        new URL(request.url).pathname
      } ${response.status} ${duration}ms\n`;
      writer.write(encoder.encode(line));
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      const line = `${request.method} ${
        new URL(request.url).pathname
      } ERROR ${duration}ms\n`;
      writer.write(encoder.encode(line));
      throw error;
    }
  };
}
