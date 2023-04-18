import { extname } from "https://deno.land/std@0.181.0/path/mod.ts";
import { JSONValue } from "./types.ts";

export class DesoResponse {
  static json(object: JSONValue) {
    return new Response(JSON.stringify(object), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  static async sendFile(filePath: string) {
    const extensionName = extname(filePath);
    const contentType = this.#getContentType(extensionName);
    try {
      const file = await Deno.readFile(filePath);
      return new Response(file, {
        headers: {
          "Content-Type": contentType,
        },
      });
    } catch {
      return new Response(`404 ${filePath} - Not Found`, {
        status: 404,
      });
    }
  }
  static #getContentType(extensionName: string) {
    switch (extensionName) {
      case ".json":
        return "application/json";
      case ".css":
        return "text/css";
      case ".js":
        return "text/javascript";
      case ".svg":
        return "image/svg+xml";
      case ".html":
      default:
        return "text/html; charset=utf-8";
    }
  }
}
