import { DesoResponse } from "../response.ts";
import { extname, join } from "https://deno.land/std@0.181.0/path/mod.ts";
import type { DesoHandler } from "../types.ts";

export const staticMiddleware = (options: {
  assetPath: string;
}): DesoHandler<string, Response> => {
  return (context): Promise<Response> => {
    const pathPattern: string = context.$_store().get("path_pattern") as string;
    const requestPath = new URL(context.req().url).pathname;
    const basePattern = pathPattern.replace("/*", "");
    const filePath = requestPath.replace(basePattern, "");
    const resolvedFilePath = extname(filePath) === ""
      ? join(filePath, "index.html")
      : filePath;
    return DesoResponse.sendFile(join(options.assetPath, resolvedFilePath));
  };
};
