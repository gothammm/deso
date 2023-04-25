import type { DesoMiddlewareHandler } from "./types.ts";
import { DesoRouter } from "./_router.ts";

export class Registry {
  router = new DesoRouter();
  middlewareRegistry = new Map<
    string,
    Array<DesoMiddlewareHandler>
  >();
  constructor() {}
}
