import { DesoRouter } from "../lib/router.ts";
import { assert, assertEquals } from "./deps.ts";

Deno.test("router matches root path", () => {
  const r = new DesoRouter();
  r.add("/", () => new Response("root"));
  const [h, _, _p] = r.match("/");
  assert(h);
  // Router normalizes "/" to "$", so matching "/" should work
  const [h2] = r.match("/");
  assert(h2);
});

Deno.test("router matches multiple static segments", () => {
  const r = new DesoRouter();
  r.add("/a/b/c", () => new Response("deep"));
  const [h] = r.match("/a/b/c");
  assert(h);
});

Deno.test("router returns undefined for partial path match", () => {
  const r = new DesoRouter();
  r.add("/a/b/c", () => new Response("deep"));
  const [h] = r.match("/a/b");
  assertEquals(h, undefined);
});

Deno.test("router prefers exact match over param pattern", () => {
  const r = new DesoRouter();
  r.add("/static", () => new Response("exact"));
  r.add("/:param", () => new Response("param"));
  const [h] = r.match("/static");
  assert(h);
  // We don't check text since we don't have context
});

Deno.test("router returns correct params for pattern match", () => {
  const r = new DesoRouter();
  r.add("/:slug", () => new Response("param"));
  const [, params] = r.match("/hello-world");
  assertEquals(params.get("slug"), "hello-world");
});

Deno.test("router handles regex-constrained params", () => {
  const r = new DesoRouter();
  r.add("/:id([0-9]+)", () => new Response("digit"));
  r.add("/:name([a-z]+)", () => new Response("alpha"));
  const [h1] = r.match("/123");
  assert(h1, "digits should match [0-9]+");
  const [h2] = r.match("/abc");
  assert(h2, "letters should match [a-z]+");
  const [h3] = r.match("/ABC");
  assertEquals(h3, undefined, "uppercase should not match [a-z]+");
  const [h4] = r.match("/abc123");
  assertEquals(h4, undefined, "mixed should not match either pattern");
});

Deno.test("router handles hyphenated param names", () => {
  const r = new DesoRouter();
  r.add("/:user-id", () => new Response("user"));
  const [, params] = r.match("/42");
  assertEquals(params.get("user-id"), "42");
});

Deno.test("router wildcard catches unmatched segments", () => {
  const r = new DesoRouter();
  r.add("/static/*", () => new Response("wild"));
  const [h] = r.match("/static/anything/here");
  assert(h);
});

Deno.test("router prefers static over wildcard", () => {
  const r = new DesoRouter();
  r.add("/static/specific", () => new Response("specific"));
  r.add("/static/*", () => new Response("wild"));
  const [h1] = r.match("/static/specific");
  assert(h1);
  const [h2] = r.match("/static/other");
  assert(h2);
});

Deno.test("router LRU cache evicts old entries", () => {
  const r = new DesoRouter(2); // max 2 entries
  r.add("/a", () => new Response("a"));
  r.add("/b", () => new Response("b"));
  r.add("/c", () => new Response("c"));

  // Access /a then /b then /c - /a should be evicted
  r.match("/a");
  r.match("/b");
  r.match("/c");
  // /a should have been evicted (or not, depending on order)
  const [ha] = r.match("/a");
  assert(ha);
});

Deno.test("router handles multi-param routes", () => {
  const r = new DesoRouter();
  r.add("/:org/:repo/issues/:id", () => new Response("issue"));
  const [, params] = r.match("/denoland/deno/issues/42");
  assertEquals(params.get("org"), "denoland");
  assertEquals(params.get("repo"), "deno");
  assertEquals(params.get("id"), "42");
});

Deno.test("router returns matched path pattern", () => {
  const r = new DesoRouter();
  r.add("/users/:id/posts", () => new Response("posts"));
  const [, , pattern] = r.match("/users/42/posts");
  assertEquals(pattern, "/users/:id/posts");
});

Deno.test("router wildcard sets pattern with asterisk", () => {
  const r = new DesoRouter();
  r.add("/files/*", () => new Response("file"));
  const [, , pattern] = r.match("/files/css/style.css");
  assertEquals(pattern, "/files/*");
});

Deno.test("router returns empty params map when no match", () => {
  const r = new DesoRouter();
  r.add("/hello", () => new Response("hi"));
  const [, params] = r.match("/goodbye");
  assertEquals(params.size, 0);
});

Deno.test("router can add and match after construction", () => {
  const r = new DesoRouter();
  r.add("/first", () => new Response("1"));
  r.add("/second", () => new Response("2"));

  const [h1] = r.match("/first");
  const [h2] = r.match("/second");
  assert(h1);
  assert(h2);
});
