export interface RouteMatchResult {
  path: string;
  params: Map<string, unknown>;
  handler: DesoHandler;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "HEAD" | "DELETE" | "PATCH";

export interface DesoRequest extends Request {
  // deno-lint-ignore no-explicit-any
  context: Map<string, any>;
}

export type DesoHandler = (request: DesoRequest) => Promise<Response> | Response;

export type DesoMiddlewareHandler = (
  request: DesoRequest
) => Promise<Response | undefined | void>;

export interface DesoMiddleware {
  exec: DesoMiddlewareHandler;
}
