import type { DesoMiddleware, DesoMiddlewareHandler } from "./types.ts";
import { DesoRouter } from "./router.ts";

export class Registry {
  getRouter = new DesoRouter();
  postRouter = new DesoRouter();
  putRouter = new DesoRouter();
  deleteRouter = new DesoRouter();
  patchRouter = new DesoRouter();
  middlewareRegistry = new Map<
    string,
    Array<DesoMiddlewareHandler | DesoMiddleware>
  >();
  constructor() {}
}
