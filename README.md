# Deso

> A simple & fast web framework for Deno

[![JSR](https://jsr.io/badges/@deso/core)](https://jsr.io/@deso/core)

```ts
import { Deso } from "jsr:@deso/core";

const app = new Deso();
app.get("/", (ctx) => ctx.text("Hello World"));
app.get("/hello/:name", (ctx) => ctx.text(`Hello ${ctx.param("name")}!`));
await app.serve({ port: 3000 });
```

## Installation

```sh
deno add jsr:@deso/core
```

## Getting Started

### 1. Basic Server

```ts
import { Deso } from "jsr:@deso/core";
const app = new Deso();

app.get("/", (ctx) => ctx.text("home"));
app.get("/ping", () => new Response("pong"));

await app.serve({ port: 3000 });
```

### 2. Path Parameters

```ts
app.get("/users/:id", (ctx) => ctx.json({ id: ctx.param("id") }));
```

### 3. Middleware

```ts
import type { DesoMiddleware } from "jsr:@deso/core";

const logger: DesoMiddleware = async (ctx, next) => {
  const start = Date.now();
  const res = await next();
  console.log(`${ctx.req().method} ${res.status} ${Date.now() - start}ms`);
  return res;
};

app.use(logger);
```

### 4. Request Body

```ts
app.post("/data", async (ctx) => {
  const body = await ctx.body("json");
  return ctx.json({ received: body });
});
```

## Features

- Standard `next()` middleware pattern (like Hono, Oak, Express)
- Trie-based router with LRU cache — fast matching
- Path params with optional regex constraints
- Nested route groups with shared middleware
- Zod schema validation (`zValidator`)
- OpenAPI 3.1 spec generation
- WebSocket support with room broadcasting
- Static file serving with Cache-Control
- Rate limiting (sliding window)
- CORS, request ID, and logger middleware
- Type-safe route params (`ParamKeys<Path>`)
- Error boundaries — handlers & middleware throwing errors return 500
- AsyncLocalStorage for per-request context

## Routes

```ts
app.get("/", (ctx) => ctx.text("GET /"));
app.post("/", (ctx) => ctx.text("POST /"));
app.put("/", (ctx) => ctx.text("PUT /"));
app.patch("/:id", (ctx) => ctx.text(`PATCH ${ctx.param("id")}`));
app.delete("/:id", (ctx) => ctx.text(`DELETE ${ctx.param("id")}`));
app.head("/", (ctx) => ctx.text(""));
app.options("/", (ctx) => ctx.text(""));
app.any("/hello", (ctx) => ctx.text("any method"));
```

## Path Parameters

```ts
app.get("/users/:id", (ctx) => ctx.json({ id: ctx.param("id") }));

// Regex constraint
app.get("/posts/:id(\\d+)", (ctx) => ctx.json({ postId: ctx.param("id") }));

// Multiple params
app.get(
  "/:tenant/items/:id",
  (ctx) => ctx.json({ tenant: ctx.param("tenant"), id: ctx.param("id") }),
);
```

## Middleware

Middleware uses the `next()` pattern. Call `next()` to continue the chain, or
return a `Response` to short-circuit.

```ts
import type { DesoMiddleware } from "jsr:@deso/core";

const logger: DesoMiddleware = async (ctx, next) => {
  const { method } = ctx.req();
  const url = ctx.req().url;
  const start = Date.now();
  const res = await next();
  console.log(`${method} ${url} ${res.status} ${Date.now() - start}ms`);
  return res;
};

app.use(logger);
```

### Middleware Order Matters

Middleware executes in FIFO order for `next()` calls and LIFO order for `next()`
returns (like Express/Hono):

```ts
app.use(async (_ctx, next) => {
  console.log("1-before");
  const res = await next();
  console.log("1-after");
  return res;
});

app.use(async (_ctx, next) => {
  console.log("2-before");
  const res = await next();
  console.log("2-after");
  return res;
});

// GET / → logs: 1-before → 2-before → handler → 2-after → 1-after
```

### Route-level

```ts
app.get("/admin", authMiddleware, rateLimiter, (ctx) => ctx.text("admin"));
```

### Global

```ts
app.use(requestId("x-request-id"));
app.use(cors({ origin: "https://example.com" }));
app.use(logger({ writer: Deno.stdout }));
```

### Group

```ts
app.group("/api", authMiddleware, () => {
  app.get("/users", listUsers);
  app.post("/users", createUser);
});
```

### Combining Multiple Middlewares

```ts
app.post(
  "/api/users",
  requestId("x-request-id"), // 1. assign request ID
  rateLimiter({ windowMs: 60000, max: 30 }), // 2. rate limit
  authMiddleware, // 3. authenticate
  zValidator("json", UserSchema), // 4. validate body
  async (ctx) => { // 5. handler
    const user = ctx.get("json");
    return ctx.json(user, 201);
  },
);
```

### Error Handling Middleware

```ts
app.use(async (ctx, next) => {
  try {
    return await next();
  } catch (err) {
    console.error("Unhandled error", err);
    return ctx.oops("internal error", 500);
  }
});
```

## Context

```ts
app.get("/hello", (ctx) => {
  ctx.header("X-Custom", "value"); // set response header
  const h = ctx.header("Authorization"); // read request header
  ctx.set("key", "value"); // store per-request data
  const v = ctx.get("key"); // retrieve per-request data
  return ctx.json({ message: "hi" });
});
```

### Response helpers

```ts
ctx.json({ data: "hello" }); // JSON response
ctx.text("hello"); // plain text
ctx.html("<h1>hello</h1>"); // HTML
ctx.stream(readableStream); // streaming response
ctx.oops("not found", 404); // error response
ctx.oops(new Error("bad request")); // error from Error instance
```

### Request body

```ts
app.post("/data", async (ctx) => {
  const json = await ctx.body("json"); // parse JSON body
  const text = await ctx.body("text"); // raw text
  const form = await ctx.body("form"); // FormData
  return ctx.json({ received: json });
});
```

## Route Groups

```ts
app.group("/api/v1", () => {
  app.get("/users", listUsers);
  app.post("/users", createUser);
});

// Nested
app.group("/api", () => {
  app.group("/v1", () => app.get("/items", getItems));
  app.group("/v2", () => app.get("/items", getItemsV2));
});
```

## Zod Validation

```ts
import { z } from "zod";
import { zValidator } from "jsr:@deso/core";

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

app.post(
  "/users",
  zValidator("json", UserSchema),
  (ctx) => {
    const user = ctx.get("json") as z.infer<typeof UserSchema>;
    return ctx.json(user, 201);
  },
);

// Query params
app.get(
  "/items",
  zValidator("query", z.object({ page: z.coerce.number().int().positive() })),
  (ctx) => ctx.json(ctx.get("query")),
);

// Route params
app.get(
  "/users/:id",
  zValidator("params", z.object({ id: z.string().regex(/^\d+$/) })),
  (ctx) => ctx.json(ctx.get("params")),
);
```

## OpenAPI

```ts
import { OpenAPIRegistry } from "jsr:@deso/core";

const registry = new OpenAPIRegistry({
  info: { title: "My API", version: "1.0.0" },
  servers: [{ url: "https://api.example.com" }],
});

registry.register("GET", "/users", {
  summary: "List users",
  tags: ["Users"],
  parameters: [{ name: "page", in: "query", schema: z.number() }],
  responses: {
    "200": {
      description: "OK",
      content: { "application/json": { schema: z.array(UserSchema) } },
    },
  },
});

console.log(JSON.stringify(registry.generate(), null, 2));
```

## WebSocket

```ts
app.ws("/chat", {
  open(ws) {
    console.log("connected");
  },
  message(ws, event) {
    ws.send(`echo: ${event.data}`);
  },
  close(ws, event) {
    console.log("disconnected");
  },
  error(ws, event) {
    console.error("ws error", event);
  },
});
```

### With middleware

```ts
app.ws("/chat", authMiddleware, {
  open(ws, ctx) {
    room.add(ws);
  },
  message(ws, event) {
    room.broadcast(event.data);
  },
});
```

### Room broadcasting

```ts
import { wsManager } from "jsr:@deso/core";

const room = wsManager.room("chat:general");

app.ws("/chat", {
  open(ws) {
    room.add(ws);
  },
  message(ws, event) {
    room.broadcast(event.data);
  },
});
```

## Static Files

```ts
import { staticMiddleware } from "jsr:@deso/core";

app.get(
  "/*",
  staticMiddleware({
    assetPath: "./public",
    cacheControl: "public, max-age=3600",
  }),
);
```

## Rate Limiting

```ts
import { rateLimiter } from "jsr:@deso/core";

app.use(rateLimiter({ windowMs: 60000, max: 100 }));

app.post(
  "/auth/login",
  rateLimiter({ windowMs: 60000, max: 5, message: "Too many" }),
  loginHandler,
);
```

## CORS & Logging

```ts
import { cors, logger, requestId } from "jsr:@deso/core";

app.use(requestId("x-request-id"));
app.use(cors({ origin: "https://example.com", methods: ["GET", "POST"] }));
app.use(logger({ writer: Deno.stdout }));
```

## Error Handling

Errors thrown in handlers or middleware are caught and return 500. Errors with a
`.status` property use that status code.

```ts
app.get("/crash", () => {
  throw new Error("boom");
}); // 500
app.get("/custom", () => {
  const err = new Error("not found") as Error & { status: number };
  err.status = 404;
  throw err; // 404
});

// Catch errors from next()
app.use(async (ctx, next) => {
  try {
    return await next();
  } catch (err) {
    return ctx.oops(err, 500);
  }
});
```

## Server

```ts
await app.serve({ port: 3000 });

// With AbortSignal (testing)
const ac = new AbortController();
await app.serve({
  port: 0,
  signal: ac.signal,
  onListen: (addr) => {
    console.log(`Listening on ${addr.port}`);
  },
});

// AsyncLocalStorage
const app = new Deso({ enableAsyncLocalStorage: true });
app.get("/als", (ctx) => ctx.text(app.als?.get("key") ?? "none"));
```

## Benchmarks

```
deno task bench
```

Results (100k iterations on M-series Mac). Throughput varies by hardware.

| Scenario               | Ops/sec    |
| ---------------------- | ---------- |
| Raw Deno.serve handler | 10,789,523 |
| Deso static route      | 2,273,194  |
| Deso param route       | 1,798,678  |
| Deso global middleware | 1,756,533  |

Full API reference at [API.md](./API.md).

## Testing

```bash
deno task test     # Run all tests
deno task check    # Format + lint + test
```
