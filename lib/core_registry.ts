import type { DesoMiddlewareHandler } from "./types.ts";
import { DesoRouter } from "./router.ts";

export class Registry {
  GET = new DesoRouter();
  POST = new DesoRouter();
  PUT = new DesoRouter();
  DELETE = new DesoRouter();
  PATCH = new DesoRouter();
  MIDDLEWARE = new Map<
    string,
    Array<DesoMiddlewareHandler>
  >();
  constructor() {}
}
