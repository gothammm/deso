import { z } from "zod";
import { OpenAPIRegistry } from "../lib/zod/mod.ts";
import { assert, assertEquals } from "./deps.ts";

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

Deno.test("OpenAPIRegistry generates basic spec with info", () => {
  const registry = new OpenAPIRegistry({
    info: { title: "Test API", version: "1.0.0" },
  });

  const spec = registry.generate();

  assertEquals(spec.openapi, "3.1.0");
  assertEquals(spec.info, { title: "Test API", version: "1.0.0" });
  assertEquals(spec.paths, {});
});

Deno.test("OpenAPIRegistry accepts custom openapi version", () => {
  const registry = new OpenAPIRegistry({
    openapi: "3.0.3",
    info: { title: "API", version: "2.0.0" },
  });

  const spec = registry.generate();
  assertEquals(spec.openapi, "3.0.3");
});

Deno.test("OpenAPIRegistry includes servers when provided", () => {
  const registry = new OpenAPIRegistry({
    info: { title: "API", version: "1.0.0" },
    servers: [{ url: "https://api.example.com", description: "Production" }],
  });

  const spec = registry.generate();
  assertEquals(spec.servers, [
    { url: "https://api.example.com", description: "Production" },
  ]);
});

Deno.test("OpenAPIRegistry registers single route", () => {
  const registry = new OpenAPIRegistry({
    info: { title: "API", version: "1.0.0" },
  });

  registry.register("GET", "/users", {
    summary: "List users",
    tags: ["Users"],
    responses: {
      "200": { description: "OK" },
    },
  });

  const spec = registry.generate();
  const pathItem = (spec.paths as Record<string, unknown>)["/users"] as Record<
    string,
    unknown
  >;
  assert(pathItem);
  const getOp = pathItem.get as Record<string, unknown>;
  assertEquals(getOp.summary, "List users");
  assertEquals(getOp.tags, ["Users"]);
  assertEquals(getOp.responses, {
    "200": { description: "OK" },
  });
});

Deno.test("OpenAPIRegistry registers multiple routes and methods", () => {
  const registry = new OpenAPIRegistry({
    info: { title: "API", version: "1.0.0" },
  });

  registry.register("GET", "/users", {
    summary: "List users",
    responses: { "200": { description: "OK" } },
  });

  registry.register("POST", "/users", {
    summary: "Create user",
    responses: { "201": { description: "Created" } },
  });

  registry.register("GET", "/users/:id", {
    summary: "Get user by ID",
    responses: { "200": { description: "OK" } },
  });

  const spec = registry.generate();
  const paths = spec.paths as Record<string, unknown>;

  assert(paths["/users"]);
  assert((paths["/users"] as Record<string, unknown>).get);
  assert((paths["/users"] as Record<string, unknown>).post);

  assert(paths["/users/:id"]);
  assert((paths["/users/:id"] as Record<string, unknown>).get);
});

Deno.test("OpenAPIRegistry includes parameters", () => {
  const registry = new OpenAPIRegistry({
    info: { title: "API", version: "1.0.0" },
  });

  registry.register("GET", "/users/:id", {
    summary: "Get user",
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        schema: z.string(),
      },
      {
        name: "include",
        in: "query",
        schema: z.string().optional(),
      },
    ],
    responses: {
      "200": { description: "OK" },
    },
  });

  const spec = registry.generate();
  const params = (
    (spec.paths as Record<string, unknown>)["/users/:id"] as Record<
      string,
      unknown
    >
  ).get as Record<string, unknown>;

  assert(params.parameters);
  const p = params.parameters as Array<Record<string, unknown>>;
  assertEquals(p.length, 2);
  assertEquals(p[0].name, "id");
  assertEquals(p[0].in, "path");
  assertEquals(p[0].required, true);
  assertEquals(p[1].name, "include");
  assertEquals(p[1].in, "query");
});

Deno.test("OpenAPIRegistry converts zod schema to JSON Schema in a parameter", () => {
  const registry = new OpenAPIRegistry({
    info: { title: "API", version: "1.0.0" },
  });

  registry.register("GET", "/users/:id", {
    summary: "Get user",
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        schema: z.string(),
      },
    ],
    responses: {
      "200": { description: "OK" },
    },
  });

  const spec = registry.generate();
  const params = (
    (spec.paths as Record<string, unknown>)["/users/:id"] as Record<
      string,
      unknown
    >
  ).get as Record<string, unknown>;

  const p = (params.parameters as Array<Record<string, unknown>>)[0];
  assert(p.schema);
  assertEquals((p.schema as Record<string, unknown>).type, "string");
});

Deno.test("OpenAPIRegistry includes request body with zod schema", () => {
  const registry = new OpenAPIRegistry({
    info: { title: "API", version: "1.0.0" },
  });

  registry.register("POST", "/users", {
    summary: "Create user",
    requestBody: {
      required: true,
      content: {
        "application/json": { schema: UserSchema },
      },
    },
    responses: {
      "201": { description: "Created" },
    },
  });

  const spec = registry.generate();
  const postOp = (
    (spec.paths as Record<string, unknown>)["/users"] as Record<string, unknown>
  ).post as Record<string, unknown>;

  assert(postOp.requestBody);
  const rb = postOp.requestBody as Record<string, unknown>;
  assertEquals(rb.required, true);
  assert(rb.content);
  const content = rb.content as Record<string, unknown>;
  assert(content["application/json"]);
  const jsonContent = content["application/json"] as Record<string, unknown>;
  assert(jsonContent.schema);
  assertEquals((jsonContent.schema as Record<string, unknown>).type, "object");
});

Deno.test("OpenAPIRegistry generates idempotent spec (generate can be called multiple times)", () => {
  const registry = new OpenAPIRegistry({
    info: { title: "API", version: "1.0.0" },
  });

  registry.register("GET", "/ping", {
    responses: { "200": { description: "OK" } },
  });

  const spec1 = registry.generate();
  const spec2 = registry.generate();

  assertEquals(spec1, spec2);
});

Deno.test("OpenAPIRegistry handles responses with schemas", () => {
  const registry = new OpenAPIRegistry({
    info: { title: "API", version: "1.0.0" },
  });

  registry.register("GET", "/users", {
    summary: "List users",
    responses: {
      "200": {
        description: "A list of users",
        content: {
          "application/json": { schema: z.array(UserSchema) },
        },
      },
    },
  });

  const spec = registry.generate();
  const getOp = (
    (spec.paths as Record<string, unknown>)["/users"] as Record<string, unknown>
  ).get as Record<string, unknown>;

  const responses = getOp.responses as Record<string, unknown>;
  const r200 = responses["200"] as Record<string, unknown>;
  assertEquals(r200.description, "A list of users");
  assert(r200.content);
});

Deno.test("OpenAPIRegistry accepts plain JSON schema objects too", () => {
  const registry = new OpenAPIRegistry({
    info: { title: "API", version: "1.0.0" },
  });

  registry.register("POST", "/data", {
    summary: "Post data",
    requestBody: {
      content: {
        "application/json": {
          schema: { type: "object", properties: { foo: { type: "string" } } },
        },
      },
    },
    responses: {
      "200": { description: "OK" },
    },
  });

  const spec = registry.generate();
  const postOp = (
    (spec.paths as Record<string, unknown>)["/data"] as Record<string, unknown>
  ).post as Record<string, unknown>;

  const rb = postOp.requestBody as Record<string, unknown>;
  const content = rb.content as Record<string, unknown>;
  const jsonContent = content["application/json"] as Record<string, unknown>;
  assertEquals(jsonContent.schema, {
    type: "object",
    properties: { foo: { type: "string" } },
  });
});

Deno.test("OpenAPIRegistry handles operationId and description", () => {
  const registry = new OpenAPIRegistry({
    info: { title: "API", version: "1.0.0" },
  });

  registry.register("GET", "/users", {
    operationId: "getUsers",
    summary: "List users",
    description: "Returns a paginated list of all users",
    responses: {
      "200": { description: "OK" },
    },
  });

  const spec = registry.generate();
  const getOp = (
    (spec.paths as Record<string, unknown>)["/users"] as Record<string, unknown>
  ).get as Record<string, unknown>;

  assertEquals(getOp.operationId, "getUsers");
  assertEquals(getOp.description, "Returns a paginated list of all users");
});
