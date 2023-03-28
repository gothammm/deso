import { DesoResponse } from "../response.ts";
import type { DesoMiddleware, DesoRequest } from "../types.ts";
import {
  join,
  extname,
  format,
} from "https://deno.land/std@0.181.0/path/mod.ts";

export class StaticMiddleware implements DesoMiddleware {
  #pattern: URLPattern;
  #pathToAssetFolder: string;
  #assetBaseRoute: string;
  constructor(path: string, pathToAssetFolder: string) {
    const hasWildCard = path.endsWith("/*");
    this.#assetBaseRoute = hasWildCard ? path.slice(0, path.indexOf("/*")) : path;
    this.#pattern = new URLPattern({ pathname: path });
    this.#pathToAssetFolder = pathToAssetFolder;
  }
  exec = async (request: DesoRequest): Promise<Response | undefined> => {
    const { pathname } = new URL(request.url);
    console.log("Skip when /hello", pathname, this.#assetBaseRoute);
    if (this.#assetBaseRoute === "/" && pathname !== "/") {
      return;
    }
    if (!pathname.startsWith(this.#assetBaseRoute) && (this.#assetBaseRoute !== "")) {
      return;
    }
    console.log("Did not Skip when /hello", pathname, this.#assetBaseRoute);
    const matchResult = this.#pattern.exec(request.url);
    if (!matchResult) {
      return;
    }
    const staticAssetRelativePath = matchResult.pathname.groups["0"] ?? "";

    const filePath = format({
      root: "",
      dir: this.#pathToAssetFolder,
      name:
        extname(staticAssetRelativePath) === ""
          ? join(staticAssetRelativePath, "index.html")
          : staticAssetRelativePath,
    });

    return await DesoResponse.sendFile(filePath);
  };
}
