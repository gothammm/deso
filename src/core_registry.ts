import type { DesoMiddleware, DesoMiddlewareHandler } from "./types.ts";
import { RouterRegistry } from "./router_registry.ts";

export class Registry {
  routerGetRegistry = new RouterRegistry("GET");
  routerPostRegistry = new RouterRegistry("POST");
  routerPutRegistry = new RouterRegistry("PUT");
  routerDeleteRegistry = new RouterRegistry("DELETE");
  routerPatchRegistry = new RouterRegistry("PATCH");
  middlewareRegistry = new Map<
    string,
    Array<DesoMiddlewareHandler | DesoMiddleware>
  >();
  constructor() {}
}
