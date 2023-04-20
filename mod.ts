import { requestId } from "./lib/middlewares/request_id_middleware.ts";
import { staticMiddleware } from "./lib/middlewares/static_middleware.ts";

export type {
  DesoHandler,
  DesoMiddlewareHandler,
  HttpMethod,
} from "./lib/types.ts";
export { DesoContext } from "./lib/context.ts";
export { Deso } from "./lib/core.ts";
export { DesoRouter } from "./lib/router.ts";
const middlewares = {
  requestId,
  staticMiddleware,
};
export { middlewares };
