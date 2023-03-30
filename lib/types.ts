import { DesoContext } from "./context.ts";

export interface RouteMatchResult {
  path: string;
  params: Record<string, unknown>;
  handler: DesoHandler;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "HEAD" | "DELETE" | "PATCH";

export type DesoHandler<Path = string> = (
  context: DesoContext<Path>
) => Promise<Response> | Response;

export type DesoMiddlewareHandler = (
  context: DesoContext<string>
) => Promise<Response | undefined | void>;

export interface DesoMiddleware {
  exec: DesoMiddlewareHandler;
}

export type JSONPrimitive = string | boolean | number | undefined | null;
export type JSONValue = JSONObject | JSONArray | JSONPrimitive;
export type JSONArray = Array<JSONObject | JSONPrimitive>;
export type JSONObject = {
  [key: string]: JSONValue;
};

type ParamKeyName<NameWithPattern> =
  NameWithPattern extends `${infer Name}{${infer _Pattern}`
    ? Name
    : NameWithPattern;

type ParamKey<Component> = Component extends `:${infer NameWithPattern}`
  ? ParamKeyName<NameWithPattern>
  : never;

export type ParamKeys<Path> = Path extends `${infer Component}/${infer Rest}`
  ? ParamKey<Component> | ParamKeys<Rest>
  : ParamKey<Path>;
