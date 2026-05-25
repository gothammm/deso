import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export interface OpenAPIConfig {
  openapi?: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{ url: string; description?: string }>;
}

export interface OperationSchema {
  summary?: string;
  description?: string;
  tags?: string[];
  operationId?: string;
  requestBody?: {
    description?: string;
    required?: boolean;
    content?: Record<string, { schema: z.ZodType | Record<string, unknown> }>;
  };
  parameters?: Array<{
    name: string;
    in: "path" | "query" | "header";
    description?: string;
    required?: boolean;
    schema: z.ZodType | Record<string, unknown>;
  }>;
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

export class OpenAPIRegistry {
  #config: OpenAPIConfig;
  #routes: RouteEntry[] = [];

  constructor(config: OpenAPIConfig) {
    this.#config = config;
  }

  register(method: string, path: string, operation: OperationSchema): void {
    this.#routes.push({
      method: method.toUpperCase(),
      path,
      operation,
    });
  }

  generate(): Record<string, unknown> {
    return {
      openapi: this.#config.openapi ?? "3.1.0",
      info: { ...this.#config.info },
      ...(this.#config.servers ? { servers: [...this.#config.servers] } : {}),
      paths: groupByPath(this.#routes),
    };
  }
}
