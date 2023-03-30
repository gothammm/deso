import { DesoContext } from "../context.ts";

// deno-lint-ignore require-await
export async function requestId(context: DesoContext): Promise<Response | undefined> {
  context._store().set('request_id', crypto.randomUUID());
  return;
}
