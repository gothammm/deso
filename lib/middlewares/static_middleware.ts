import type { DesoContext } from "../context.ts";
import { extname, join, serveFile } from "../deps.ts";
import type { DesoHandler } from "../types.ts";

export interface StaticMiddlewareOptions {
  assetPath: string;
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
