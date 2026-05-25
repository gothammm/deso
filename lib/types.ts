import type { DesoContext } from "./context.ts";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type Next = () => Promise<Response>;

export type DesoMiddleware<Path = string> = (
  context: DesoContext<Path>,
  next: Next,
) => Response | Promise<Response>;

export type DesoHandler<Path = string> = (
  context: DesoContext<Path>,
) => Response | Promise<Response>;

export type JSONPrimitive = string | boolean | number | undefined | null;
export type JSONValue = JSONObject | JSONArray | JSONPrimitive;
export type JSONArray = Array<JSONValue>;
export type JSONObject = { [key: string]: JSONValue };

type ParamKeyName<NameWithPattern> = NameWithPattern extends
  `${infer Name}(${infer _Pattern})` ? Name
  : NameWithPattern;

type ParamKey<Component> = Component extends `:${infer NameWithPattern}`
  ? ParamKeyName<NameWithPattern>
  : never;

export type ParamKeys<Path> = Path extends `${infer Component}/${infer Rest}`
  ? ParamKey<Component> | ParamKeys<Rest>
  : ParamKey<Path>;

type Enumerate<
  N extends number,
  Acc extends number[] = [],
> = Acc["length"] extends N ? Acc[number]
  : Enumerate<N, [...Acc, Acc["length"]]>;

type Range<F extends number, T extends number> = Exclude<
  Enumerate<T>,
  Enumerate<F>
>;

export type ClientErrorStatusCode = Range<400, 499>;
export type ServerErrorStatusCode = Range<500, 599>;

type Params = Map<string, unknown>;
export type RouteParams = Params;
export type SearchParams = Params;
