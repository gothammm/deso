import { DesoMiddlewareHandler } from "../../mod.ts";
import { DesoContext } from "../context.ts";

export function requestId<K extends string>(key: K): DesoMiddlewareHandler {
  return (context: DesoContext) => {
    const requestId = crypto.randomUUID();
    context.set(key, requestId);
    context.header(key, requestId);
    return Promise.resolve();
  };
}
