
import { requestId } from "./lib/middlewares/request_id_middleware.ts";
import { StaticMiddleware } from './lib/middlewares/static_middleware.ts';


export type {
  DesoRequest,
  DesoMiddleware,
  DesoMiddlewareHandler,
} from './lib/types.ts'
export { Deso } from './lib/core.ts';
const middlewares = {
  StaticMiddleware,
  requestId,
}
export { middlewares };
