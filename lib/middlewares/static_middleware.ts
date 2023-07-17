import { extname, join, serveFile } from "../deps.ts";
import type { DesoHandler } from "../types.ts";

export const staticMiddleware = (options: {
  assetPath: string;
}): DesoHandler<string, Response> => {
  return (context): Promise<Response> => {
    const request = context.req();
    const pathPattern: string = context.store.get("path_pattern") as string;
    const requestPath = new URL(request.url).pathname;
    const basePattern = pathPattern.replace("/*", "");
    const filePath = requestPath.replace(basePattern, "");
    const resolvedFilePath = extname(filePath) === ""
      ? join(filePath, "index.html")
      : filePath;
    return serveFile(request, join(options.assetPath, resolvedFilePath));
  };
};
