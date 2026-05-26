/**
 * Core type definitions shared across the Deso framework.
 *
 * Includes HTTP method unions, middleware and handler signatures,
 * JSON value types, route-param extractors, and HTTP status-code ranges.
 * @module
 */
import type { DesoContext } from "./context.ts";

/** Supported HTTP methods for route registration. */
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

/** The `next` function passed to a middleware to continue the chain. */
export type Next = () => Promise<Response>;

/**
 * A middleware function that can inspect/modify the request, call `next()`
 * to continue the chain, or return a response directly (short-circuit).
 *
 * @template Path - The route pattern (for type-safe params).
 */
export type DesoMiddleware<Path = string> = (
  context: DesoContext<Path>,
  next: Next,
) => Response | Promise<Response>;

/**
 * A terminal route handler. Receives the context and returns a response.
 * Unlike a middleware, it does not receive a `next` function.
 *
 * @template Path - The route pattern (for type-safe params).
 */
export type DesoHandler<Path = string> = (
  context: DesoContext<Path>,
) => Response | Promise<Response>;

/** Primitive JSON values. */
export type JSONPrimitive = string | boolean | number | undefined | null;
/** Any valid JSON value (recursive). */
export type JSONValue = JSONObject | JSONArray | JSONPrimitive;
/** A JSON array. */
export type JSONArray = Array<JSONValue>;
/** A JSON object. */
export type JSONObject = { [key: string]: JSONValue };

type ParamKeyName<NameWithPattern> = NameWithPattern extends
  `${infer Name}(${infer _Pattern})` ? Name
  : NameWithPattern;

type ParamKey<Component> = Component extends `:${infer NameWithPattern}`
  ? ParamKeyName<NameWithPattern>
  : never;

/**
 * Extracts route parameter names from a path pattern as a union of string
 * literal types.
 *
 * @template Path - The path pattern (e.g. `/users/:id/posts/:postId`).
 */
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

/** HTTP 4xx client-error status codes (400–499). */
export type ClientErrorStatusCode = Range<400, 499>;
/** HTTP 5xx server-error status codes (500–599). */
export type ServerErrorStatusCode = Range<500, 599>;

type Params = Map<string, unknown>;
/** Map of route parameter names to their values. */
export type RouteParams = Params;
/** Map of query/search parameter names to their values. */
export type SearchParams = Params;
