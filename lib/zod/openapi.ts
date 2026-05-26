/**
 * OpenAPI 3.1 specification generator.
 *
 * Provides `OpenAPIRegistry` for collecting route metadata and Zod
 * schemas, then generating a complete OpenAPI document with automatic
 * Zod-to-JSON-Schema conversion.
 * @module
 */
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

/** Root configuration for the generated OpenAPI spec. */
export interface OpenAPIConfig {
  /** OpenAPI version string (default `"3.1.0"`). */
  openapi?: string;
  /** API metadata (title, version, description). */
  info: {
    title: string;
    version: string;
    description?: string;
  };
  /** Optional API server definitions. */
  servers?: Array<{ url: string; description?: string }>;
}

/** Schema describing a single API operation (method on a path). */
export interface OperationSchema {
  /** Short summary of the operation. */
  summary?: string;
  /** Detailed description. */
  description?: string;
  /** Tag grouping for the operation. */
  tags?: string[];
  /** Unique operation ID. */
  operationId?: string;
  /** Request-body definition with content-type → schema mapping. */
  requestBody?: {
    description?: string;
    required?: boolean;
    content?: Record<string, { schema: z.ZodType | Record<string, unknown> }>;
  };
  /** Path/query/header parameters with optional Zod schemas. */
  parameters?: Array<{
    name: string;
    in: "path" | "query" | "header";
    description?: string;
    required?: boolean;
    schema: z.ZodType | Record<string, unknown>;
  }>;
  /** Response definitions per status code. */
  responses: Record<
    string,
    {
      description: string;
      content?: Record<string, { schema: z.ZodType | Record<string, unknown> }>;
    }
  >;
}

interface RouteEntry {
  method: string;
  path: string;
  operation: OperationSchema;
}

const resolveSchema = (
  schema: z.ZodType | Record<string, unknown>,
): Record<string, unknown> =>
  schema instanceof z.ZodType
    ? zodToJsonSchema(schema, { target: "openApi3" })
    : (schema as Record<string, unknown>);

const mapContent = (
  content: Record<string, { schema: z.ZodType | Record<string, unknown> }>,
): Record<string, { schema: Record<string, unknown> }> =>
  Object.fromEntries(
    Object.entries(content).map(([mediaType, c]) => [
      mediaType,
      { schema: resolveSchema(c.schema) },
    ]),
  );

const buildResponses = (
  responses: OperationSchema["responses"],
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(responses).map(([statusCode, response]) => [
      statusCode,
      {
        description: response.description,
        ...(response.content ? { content: mapContent(response.content) } : {}),
      },
    ]),
  );

const buildOperation = (op: OperationSchema): Record<string, unknown> => ({
  ...(op.summary ? { summary: op.summary } : {}),
  ...(op.description ? { description: op.description } : {}),
  ...(op.tags ? { tags: op.tags } : {}),
  ...(op.operationId ? { operationId: op.operationId } : {}),
  ...(op.parameters
    ? {
      parameters: op.parameters.map((p) => ({
        ...p,
        schema: resolveSchema(p.schema),
      })),
    }
    : {}),
  ...(op.requestBody
    ? {
      requestBody: {
        ...(op.requestBody.description
          ? { description: op.requestBody.description }
          : {}),
        ...(op.requestBody.required !== undefined
          ? { required: op.requestBody.required }
          : {}),
        ...(op.requestBody.content
          ? { content: mapContent(op.requestBody.content) }
          : {}),
      },
    }
    : {}),
  ...(op.responses ? { responses: buildResponses(op.responses) } : {}),
});

const groupByPath = (
  routes: RouteEntry[],
): Record<string, Record<string, unknown>> => {
  const grouped = new Map<string, RouteEntry[]>();
  for (const route of routes) {
    const existing = grouped.get(route.path) ?? [];
    existing.push(route);
    grouped.set(route.path, existing);
  }
  return Object.fromEntries(
    Array.from(grouped).map(([path, entries]) => [
      path,
      Object.fromEntries(
        entries.map(({ method, operation }) => [
          method.toLowerCase(),
          buildOperation(operation),
        ]),
      ),
    ]),
  );
};

/**
 * Registry for building an OpenAPI 3.1 specification.
 *
 * Collect route metadata (method, path, parameters, request body,
 * responses) and generate a complete OpenAPI document on demand.
 *
 * ```ts
 * const registry = new OpenAPIRegistry({
 *   info: { title: "My API", version: "1.0.0" },
 * });
 * registry.register("GET", "/users", { … });
 * const spec = registry.generate();
 * ```
 */
export class OpenAPIRegistry {
  #config: OpenAPIConfig;
  #routes: RouteEntry[] = [];

  /**
   * @param config - OpenAPI info, version, and server URLs.
   */
  constructor(config: OpenAPIConfig) {
    this.#config = config;
  }

  /**
   * Register an API operation.
   * @param method - HTTP method (case-insensitive).
   * @param path - URL path pattern (e.g. `/users/:id`).
   * @param operation - Operation metadata including params, body, responses.
   */
  register(method: string, path: string, operation: OperationSchema): void {
    this.#routes.push({
      method: method.toUpperCase(),
      path,
      operation,
    });
  }

  /**
   * Generate the complete OpenAPI specification object.
   * Can be called multiple times (idempotent).
   *
   * @returns A plain object conforming to the OpenAPI 3.1 schema.
   */
  generate(): Record<string, unknown> {
    return {
      openapi: this.#config.openapi ?? "3.1.0",
      info: { ...this.#config.info },
      ...(this.#config.servers ? { servers: [...this.#config.servers] } : {}),
      paths: groupByPath(this.#routes),
    };
  }
}
