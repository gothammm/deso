import { DesoContext } from "../lib/context.ts";
import { STATUS_CODE } from "../lib/deps.ts";
import { assertEquals } from "./deps.ts";

Deno.test("context.json returns Response with correct status", async () => {
  const ctx = new DesoContext(new Request("https://test.com"));
  const res = ctx.json({ hello: "world" });
  assertEquals(res.status, STATUS_CODE.OK);
  assertEquals(await res.json(), { hello: "world" });
});

Deno.test("context.json accepts custom status", () => {
  const ctx = new DesoContext(new Request("https://test.com"));
  const res = ctx.json({ error: "not found" }, STATUS_CODE.NotFound);
  assertEquals(res.status, 404);
});

Deno.test("context.text returns plain text response", async () => {
  const ctx = new DesoContext(new Request("https://test.com"));
  const res = ctx.text("hello");
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "hello");
});

Deno.test("context.html sets Content-Type header", async () => {
  const ctx = new DesoContext(new Request("https://test.com"));
  const res = ctx.html("<h1>Title</h1>");
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "text/html");
  assertEquals(await res.text(), "<h1>Title</h1>");
});

Deno.test("context.oops returns error message with status", async () => {
  const ctx = new DesoContext(new Request("https://test.com"));
  const res = ctx.oops("Something broke", 500);
  assertEquals(res.status, 500);
  assertEquals(await res.text(), "Something broke");
});

Deno.test("context.oops with Error instance returns message", async () => {
  const ctx = new DesoContext(new Request("https://test.com"));
  const res = ctx.oops(new Error("failure"), 500);
  assertEquals(res.status, 500);
  assertEquals(await res.text(), "failure");
});

Deno.test("context.oops with Error that has status property", () => {
  const ctx = new DesoContext(new Request("https://test.com"));
  const err = new Error("bad request") as Error & { status: number };
  err.status = 400;
  const res = ctx.oops(err, 500);
  assertEquals(res.status, 400);
});

Deno.test("context.oops with JSONValue returns json", async () => {
  const ctx = new DesoContext(new Request("https://test.com"));
  const res = ctx.oops({ error: "not found" }, 404);
  assertEquals(res.status, 404);
  assertEquals(await res.json(), { error: "not found" });
});

Deno.test("context.param retrieves route params", () => {
  const params = new Map([["id", "42"]]);
  const ctx = new DesoContext(new Request("https://test.com/42"), {
    routeParams: params,
  });
  assertEquals(ctx.param("id"), "42");
  assertEquals(ctx.param("nonexistent"), undefined);
});

Deno.test("context.param after loadParams", () => {
  const ctx = new DesoContext(new Request("https://test.com"));
  ctx.loadParams(new Map([["name", "john"]]));
  assertEquals(ctx.param("name"), "john");
});

Deno.test("context.query retrieves search params", () => {
  const ctx = new DesoContext(
    new Request("https://test.com/path?page=2&sort=asc"),
  );
  assertEquals(ctx.query("page"), "2");
  assertEquals(ctx.query("sort"), "asc");
  assertEquals(ctx.query("missing"), undefined);
});

Deno.test("context.header getter reads request header", () => {
  const req = new Request("https://test.com", {
    headers: { "x-custom": "hello" },
  });
  const ctx = new DesoContext(req);
  assertEquals(ctx.header("x-custom"), "hello");
  assertEquals(ctx.header("missing"), undefined);
});

Deno.test("context.header setter accumulates headers", () => {
  const ctx = new DesoContext(new Request("https://test.com"));
  ctx.header("X-First", "one");
  ctx.header("X-Second", "two");
  const res = ctx.text("ok");
  assertEquals(res.headers.get("X-First"), "one");
  assertEquals(res.headers.get("X-Second"), "two");
});

Deno.test("context.header setter with append adds multiple values", () => {
  const ctx = new DesoContext(new Request("https://test.com"));
  ctx.header("X-Set", "first");
  ctx.header("X-Set", "second", { append: true });
  const res = ctx.text("ok");
  assertEquals(res.headers.get("X-Set"), "first, second");
});

Deno.test("headers persist across json and text responses", () => {
  const ctx = new DesoContext(new Request("https://test.com"));
  ctx.header("X-Request-Id", "abc123");
  const res1 = ctx.json({ ok: true });
  assertEquals(res1.headers.get("X-Request-Id"), "abc123");
  const ctx2 = new DesoContext(new Request("https://test.com"));
  ctx2.header("X-Custom", "value");
  const res2 = ctx2.text("hello");
  assertEquals(res2.headers.get("X-Custom"), "value");
});

Deno.test("context.store set/get roundtrips values", () => {
  const ctx = new DesoContext(new Request("https://test.com"));
  ctx.set("user", { id: 1, name: "Alice" });
  assertEquals(ctx.get("user"), { id: 1, name: "Alice" });
});

Deno.test("context.body json parses request body", async () => {
  const req = new Request("https://test.com", {
    method: "POST",
    body: JSON.stringify({ key: "value" }),
    headers: { "Content-Type": "application/json" },
  });
  const ctx = new DesoContext(req);
  const body = await ctx.body("json");
  assertEquals(body, { key: "value" });
});

Deno.test("context.body json with invalid body returns empty object", async () => {
  const req = new Request("https://test.com", {
    method: "POST",
    body: "not json{",
    headers: { "Content-Type": "application/json" },
  });
  const ctx = new DesoContext(req);
  const body = await ctx.body("json");
  assertEquals(body, {});
});

Deno.test("context.body text returns raw text", async () => {
  const req = new Request("https://test.com", {
    method: "POST",
    body: "raw text content",
  });
  const ctx = new DesoContext(req);
  const text = await ctx.body("text");
  assertEquals(text, "raw text content");
});

Deno.test("context.stream creates streaming response", async () => {
  const ctx = new DesoContext(new Request("https://test.com"));
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("chunk1"));
      controller.close();
    },
  });
  const res = ctx.stream(stream, 200, "text/plain");
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Type"), "text/plain");
  const text = await res.text();
  assertEquals(text, "chunk1");
});

Deno.test("context.req returns the original request", () => {
  const req = new Request("https://test.com/hello");
  const ctx = new DesoContext(req);
  assertEquals(ctx.req().url, "https://test.com/hello");
});

Deno.test("context.store exposes the internal store", () => {
  const ctx = new DesoContext(new Request("https://test.com"));
  ctx.set("custom_key", "custom_value");
  assertEquals(ctx.get("custom_key"), "custom_value");
  // store uses "ctx:" prefix internally
  assertEquals(ctx.store.get("ctx:custom_key"), "custom_value");
});

Deno.test("query() with multiple same-named params returns first", () => {
  const ctx = new DesoContext(new Request("https://test.com?tag=a&tag=b"));
  assertEquals(ctx.query("tag"), "a");
});
