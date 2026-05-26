/**
 * Static-file serving middleware.
 *
 * Serves files from a local directory on disk. Supports an optional
 * `Cache-Control` header and is designed to be used as a route handler
 * (typically mounted on a wildcard path like `/static/*`).
 * @module
 */
import type { DesoContext } from "../context.ts";
import { extname, join, serveFile } from "../deps.ts";
import type { DesoHandler } from "../types.ts";

/** Options for the {@link staticMiddleware} handler. */
export interface StaticMiddlewareOptions {
  /** Absolute or relative path to the directory containing static assets. */
  assetPath: string;
  /** Optional `Cache-Control` header value (e.g. `"public, max-age=3600"`). */
  cacheControl?: string;
}

const addCacheHeaders = (
  response: Response,
  cacheControl?: string,
): Response => {
  if (!cacheControl) return response;
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", cacheControl);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const stripLeadingSlash = (s: string): string =>
  s.startsWith("/") ? s.slice(1) : s;

const resolvePath = (basePattern: string, requestPath: string): string => {
  const relativePath = basePattern === "/"
    ? requestPath
    : requestPath.replace(basePattern, "");
  const stripped = stripLeadingSlash(relativePath);
  if (extname(stripped) !== "") return stripped;
  if (stripped.endsWith("/")) return `${stripped}index.html`;
  return stripped;
};

/**
 * Static-file serving handler.
 *
 * Resolves the request path against the configured `assetPath` directory.
 * If the resolved path has no file extension it attempts `index.html`.
 * Returns a 404 response when the file is not found.
 *
 * Typically mounted on a wildcard route:
 *
 * ```ts
 * app.get("/static/*", staticMiddleware({ assetPath: "./public" }));
 * ```
 *
 * @param options - Directory path and optional cache header.
 */
export const staticMiddleware = (
  options: StaticMiddlewareOptions,
): DesoHandler<string> => {
  const cacheControl = options.cacheControl;

  return async (context: DesoContext<string>): Promise<Response> => {
    const request = context.req();
    const pathPattern = context.store.get("path_pattern") as string;
    const requestPath = new URL(request.url).pathname;
    const basePattern = pathPattern.replace("/*", "");

    const relativePath = resolvePath(basePattern, requestPath);
    const fullPath = join(options.assetPath, relativePath);

    try {
      const response = await serveFile(request, fullPath);
      return addCacheHeaders(response, cacheControl);
    } catch {
      return context.oops("404 - Not Found", 404);
    }
  };
};
