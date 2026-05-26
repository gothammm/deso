/**
 * Zod-based request validation middleware.
 *
 * Validates the JSON body, query string, or route parameters against a
 * Zod schema. Stores the validated (transformed) data on the context
 * under the target key so downstream handlers can access it via
 * `context.get("json")`, `context.get("query")`, or `context.get("params")`.
 * @module
 */
import type { z } from "zod";
import type { DesoContext } from "../context.ts";
import type { DesoMiddleware, JSONValue } from "../types.ts";

const paramEntries = (ctx: DesoContext): Record<string, string> =>
  Object.fromEntries(
    Array.from(ctx.store.entries())
      .filter(([key]) => key.startsWith("p:"))
      .map(([key, value]) => [key.slice(2), value] as [string, string]),
  );

const queryEntries = (req: Request): Record<string, string> =>
  Object.fromEntries(new URL(req.url).searchParams.entries());

const jsonBody = (ctx: DesoContext): Promise<Record<string, unknown>> =>
  ctx.body("json");

type InputExtractor = (ctx: DesoContext) => Promise<unknown> | unknown;

const extractors: Record<string, InputExtractor> = {
  json: (ctx) => jsonBody(ctx),
  query: (ctx) => queryEntries(ctx.req()),
  params: (ctx) => paramEntries(ctx),
};

const toJSON = (value: unknown): JSONValue => {
  if (value instanceof Map) return Object.fromEntries(value);
  if (value instanceof Set) return [...value].map(toJSON);
  if (Array.isArray(value)) return value.map(toJSON);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, toJSON(v)]),
    );
  }
  return value as JSONValue;
};

const validationError = (issues: z.ZodIssue[]) => ({
  error: "Validation failed",
  issues: toJSON(issues),
});

/**
 * Middleware that validates the request against a Zod schema.
 *
 * Supported targets:
 * - `"json"` — validates the parsed JSON body
 * - `"query"` — validates the query-string parameters
 * - `"params"` — validates the route parameters
 *
 * On validation failure a 400 response with `{ error, issues }` is returned.
 * On success the validated data is stored on the context under the target
 * key name.
 *
 * @param target - Which part of the request to validate.
 * @param schema - A Zod schema to validate against.
 *
 * ```ts
 * const UserSchema = z.object({ name: z.string(), age: z.number() });
 * app.post("/users", zValidator("json", UserSchema), (ctx) => {
 *   const user = ctx.get("json");
 * });
 * ```
 */
export const zValidator = <T extends z.ZodType>(
  target: "json" | "query" | "params",
  schema: T,
): DesoMiddleware => {
  const extract = extractors[target];
  return async (ctx, next) => {
    const input = await extract(ctx);
    const result = schema.safeParse(input);
    if (!result.success) {
      return ctx.json(validationError(result.error.issues), 400);
    }
    ctx.set(target, result.data);
    return next();
  };
};
