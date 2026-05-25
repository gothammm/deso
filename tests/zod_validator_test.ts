import { z } from "zod";
import { zValidator } from "../lib/zod/mod.ts";
import { Deso } from "../mod.ts";
import { assert, assertEquals } from "./deps.ts";
import { desoServer } from "./fixtures.ts";

const UserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().min(18).optional(),
});

Deno.test("zValidator validates JSON body and passes data to handler", async () => {
  const app = new Deso();

  app.post(
    "/users",
    zValidator("json", UserSchema),
    (ctx) => ctx.json(ctx.get("json") as z.infer<typeof UserSchema>, 201),
  );

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Alice", email: "alice@test.com", age: 25 }),
    });
    assertEquals(res.status, 201);
    const body = await res.json();
    assertEquals(body.name, "Alice");
    assertEquals(body.email, "alice@test.com");
    assertEquals(body.age, 25);
  });
});

Deno.test("zValidator returns 400 for invalid JSON body", async () => {
  const app = new Deso();

  app.post(
    "/users",
    zValidator("json", UserSchema),
    () => new Response("should not reach"),
  );

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "A", email: "not-an-email" }),
    });
    assertEquals(res.status, 400);
    const body = await res.json();
    assertEquals(body.error, "Validation failed");
    assert(Array.isArray(body.issues));
    assert(body.issues.length > 0);
  });
});

Deno.test("zValidator validates query params", async () => {
  const app = new Deso();
  const QuerySchema = z.object({
    page: z.string().refine((v) => !Number.isNaN(Number(v)), "must be number"),
    limit: z.string().optional(),
  });

  app.get(
    "/items",
    zValidator("query", QuerySchema),
    (ctx) => ctx.json(ctx.get("query") as Record<string, string>),
  );

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/items?page=1&limit=10`);
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.page, "1");
    assertEquals(body.limit, "10");
  });
});

Deno.test("zValidator returns 400 for invalid query params", async () => {
  const app = new Deso();
  const QuerySchema = z.object({
    page: z.string().refine((v) => !Number.isNaN(Number(v)), "must be number"),
  });

  app.get(
    "/items",
    zValidator("query", QuerySchema),
    () => new Response("should not reach"),
  );

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/items?page=abc`);
    assertEquals(res.status, 400);
    const body = await res.json();
    assertEquals(body.error, "Validation failed");
  });
});

Deno.test("zValidator validates route params", async () => {
  const app = new Deso();
  const ParamsSchema = z.object({
    id: z.string().regex(/^\d+$/, "must be numeric"),
  });

  app.get(
    "/users/:id",
    zValidator("params", ParamsSchema),
    (ctx) => ctx.json(ctx.get("params") as Record<string, string>),
  );

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/users/42`);
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.id, "42");
  });
});

Deno.test("zValidator returns 400 for invalid route params", async () => {
  const app = new Deso();
  const ParamsSchema = z.object({
    id: z.string().regex(/^\d+$/, "must be numeric"),
  });

  app.get(
    "/users/:id",
    zValidator("params", ParamsSchema),
    () => new Response("should not reach"),
  );

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/users/abc`);
    assertEquals(res.status, 400);
    const body = await res.json();
    assertEquals(body.error, "Validation failed");
  });
});

Deno.test("zValidator on params with multiple params validates all", async () => {
  const app = new Deso();
  const ParamsSchema = z.object({
    userId: z.string().regex(/^\d+$/),
    postId: z.string().regex(/^\d+$/),
  });

  app.get(
    "/users/:userId/posts/:postId",
    zValidator("params", ParamsSchema),
    (ctx) => ctx.json(ctx.get("params") as Record<string, string>),
  );

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/users/1/posts/99`);
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.userId, "1");
    assertEquals(body.postId, "99");
  });
});

Deno.test("multiple zValidators can be chained", async () => {
  const app = new Deso();
  const QuerySchema = z.object({ limit: z.string().optional() });
  const ParamsSchema = z.object({ id: z.string() });

  app.get(
    "/resource/:id",
    zValidator("params", ParamsSchema),
    zValidator("query", QuerySchema),
    (ctx) =>
      ctx.json({
        params: ctx.get("params"),
        query: ctx.get("query"),
      }),
  );

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/resource/abc?limit=5`);
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.params.id, "abc");
    assertEquals(body.query.limit, "5");
  });
});

Deno.test("zValidator stores validated data under target key", async () => {
  const app = new Deso();

  app.post(
    "/test",
    zValidator("json", z.object({ value: z.number() })),
    (ctx) => {
      const stored = ctx.get("json") as { value: number };
      return ctx.json({ got: stored.value * 2 });
    },
  );

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: 21 }),
    });
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.got, 42);
  });
});
