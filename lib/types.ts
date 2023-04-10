import { DesoContext } from "./context.ts";

export interface RouteMatchResult {
  path: string;
  params: Record<string, unknown>;
  handler: DesoHandler;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "HEAD" | "DELETE" | "PATCH";

export type DesoHandler<Path = string, R = Response> = (
  context: DesoContext<Path>,
) => Promise<R> | R;


export type DesoMiddlewareHandler<Path = string, R = Response | undefined> = DesoHandler<Path, R>;

export type JSONPrimitive = string | boolean | number | undefined | null;
export type JSONValue = JSONObject | JSONArray | JSONPrimitive;
export type JSONArray = Array<JSONObject | JSONPrimitive>;
export type JSONObject = {
  [key: string]: JSONValue;
};

type ParamKeyName<NameWithPattern> = NameWithPattern extends
  `${infer Name}(${infer _Pattern})` ? Name
  : NameWithPattern;

type ParamKey<Component> = Component extends `:${infer NameWithPattern}`
  ? ParamKeyName<NameWithPattern>
  : never;

export type ParamKeys<Path> = Path extends `${infer Component}/${infer Rest}`
  ? ParamKey<Component> | ParamKeys<Rest>
  : ParamKey<Path>;
