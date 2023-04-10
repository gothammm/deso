import { requestId } from "./lib/middlewares/request_id_middleware.ts";
import { staticMiddleware } from "./lib/middlewares/static_middleware.ts";

export type { DesoMiddlewareHandler } from "./lib/types.ts";
export { Deso } from "./lib/core.ts";
const middlewares = {
  requestId,
  staticMiddleware,
};
export { middlewares };
