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
    if (!path.endsWith("/*")) {
      throw new Error("Path must end with a wild card, ex: '/assets/*'");
    }
    this.#assetBaseRoute = path.slice(0, path.indexOf("/*"));
    this.#pattern = new URLPattern({ pathname: path });
    this.#pathToAssetFolder = pathToAssetFolder;
  }
  exec = async (request: DesoRequest): Promise<Response | undefined> => {
    const { pathname } = new URL(request.url);
    if (!pathname.startsWith(this.#assetBaseRoute) && this.#assetBaseRoute !== "") {
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
      name:
        extname(staticAssetRelativePath) === ""
          ? join(staticAssetRelativePath, "index.html")
          : staticAssetRelativePath,
    });

    return await DesoResponse.sendFile(filePath);
  };
}
