import { DesoMiddlewareHandler } from "../../mod.ts";
import { DesoContext } from "../context.ts";

export function requestId<K extends string>(
  key: K,
): DesoMiddlewareHandler<string, unknown> {
  return (context: DesoContext): Promise<void> => {
    const requestId = crypto.randomUUID();
    context.set(key, requestId);
    context.header(key, requestId);
    return Promise.resolve();
  };
}
