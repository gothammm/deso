import type { DesoMiddleware } from "../types.ts";

export interface CorsOptions {
  origin?: string | string[] | ((origin: string) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export function cors(options: CorsOptions = {}): DesoMiddleware {
  const defaults = {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"],
    allowedHeaders: [],
    exposedHeaders: [],
    credentials: false,
    maxAge: 86400,
  };

  const config = { ...defaults, ...options };

  return (context, next) => {
    const request = context.req();
    const origin = request.headers.get("origin") ?? "";

    const resolveOrigin = (): string => {
      if (typeof config.origin === "string") return config.origin;
      if (Array.isArray(config.origin)) {
        return config.origin.includes(origin) ? origin : "null";
      }
      return config.origin(origin) ? origin : "null";
    };

    const allowedOrigin = resolveOrigin();
    context.header("Access-Control-Allow-Origin", allowedOrigin);

    if (config.credentials) {
      context.header("Access-Control-Allow-Credentials", "true");
    }

    if (config.exposedHeaders.length > 0) {
      context.header(
        "Access-Control-Expose-Headers",
        config.exposedHeaders.join(", "),
      );
    }

    if (request.method === "OPTIONS") {
      context.header("Access-Control-Allow-Methods", config.methods.join(", "));
      if (config.allowedHeaders.length > 0) {
        context.header(
          "Access-Control-Allow-Headers",
          config.allowedHeaders.join(", "),
        );
      }
      context.header("Access-Control-Max-Age", String(config.maxAge));
      return context.text("", 204);
    }

    return next();
  };
}
