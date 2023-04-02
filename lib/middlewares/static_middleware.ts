import { DesoContext } from "../context.ts";
import { DesoResponse } from "../response.ts";
import type { DesoMiddleware } from "../types.ts";
import {
  extname,
  format,
  join,
} from "https://deno.land/std@0.181.0/path/mod.ts";

export class StaticMiddleware implements DesoMiddleware {
  #pattern: URLPattern;
  #pathToAssetFolder: string;
  #assetBaseRoute: string;
  constructor(path: string, pathToAssetFolder: string) {
    const hasWildCard = path.endsWith("/*");
    this.#assetBaseRoute = hasWildCard
      ? path.slice(0, path.indexOf("/*"))
      : path;
    this.#pattern = new URLPattern({ pathname: path });
    this.#pathToAssetFolder = pathToAssetFolder;
  }
  exec = async (context: DesoContext): Promise<Response | undefined> => {
    const request = context.req();
    const { pathname } = new URL(request.url);
    if (this.#assetBaseRoute === "/" && pathname !== "/") {
      return;
    }
    if (
      !pathname.startsWith(this.#assetBaseRoute) &&
      (this.#assetBaseRoute !== "")
    ) {
      return;
    }
    const matchResult = this.#pattern.exec(request.url);
    if (!matchResult) {
      return;
    }
    const staticAssetRelativePath = matchResult.pathname.groups["0"] ?? "";

    const filePath = format({
      root: "",
      dir: this.#pathToAssetFolder,
      name: extname(staticAssetRelativePath) === ""
        ? join(staticAssetRelativePath, "index.html")
        : staticAssetRelativePath,
    });

    return await DesoResponse.sendFile(filePath);
  };
}
