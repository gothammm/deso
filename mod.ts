
import { requestId } from "./src/middlewares/request_id_middleware.ts";
import { StaticMiddleware } from './src/middlewares/static_middleware.ts';


export type {
  DesoRequest,
  DesoMiddleware,
  DesoMiddlewareHandler,
} from './src/types.ts'
export { Deso } from './src/core.ts';
const middlewares = {
  StaticMiddleware,
  requestId,
}
export { middlewares };
