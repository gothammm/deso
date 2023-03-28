import { DesoRequest } from "../types.ts";

// deno-lint-ignore require-await
export async function requestId(request: DesoRequest): Promise<Response | undefined> {
  request.context.set('request_id', crypto.randomUUID());
  return;
}
