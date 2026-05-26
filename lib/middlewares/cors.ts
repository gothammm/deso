/**
 * CORS (Cross-Origin Resource Sharing) middleware.
 *
 * Sets the appropriate `Access-Control-*` headers based on the configured
 * options. Automatically handles pre-flight `OPTIONS` requests.
 * @module
 */
import type { DesoMiddleware } from "../types.ts";

/** Options for the {@link cors} middleware. */
export interface CorsOptions {
  /** Allowed origin(s): a string, an array, or a predicate function (default `"*"`). */
  origin?: string | string[] | ((origin: string) => boolean);
  /** Allowed HTTP methods for pre-flight (default `["GET", "POST", …]`). */
  methods?: string[];
  /** Headers allowed in the actual request. */
  allowedHeaders?: string[];
  /** Headers exposed to the client. */
  exposedHeaders?: string[];
  /** Whether to include `Access-Control-Allow-Credentials`. */
  credentials?: boolean;
  /** Pre-flight cache duration in seconds (default 86400). */
  maxAge?: number;
}

/**
 * CORS middleware. Sets `Access-Control-*` headers on every response and
 * short-circuits `OPTIONS` pre-flight requests with a 204.
 *
 * @param options - CORS configuration (all optional, sensible defaults).
 *
 * ```ts
 * app.use(cors({ origin: "https://example.com", credentials: true }));
 * ```
 */
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
