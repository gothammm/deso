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
