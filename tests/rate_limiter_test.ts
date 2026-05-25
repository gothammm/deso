import { Deso, rateLimiter } from "../mod.ts";
import { assert, assertEquals } from "./deps.ts";
import { desoServer } from "./fixtures.ts";

Deno.test("rateLimiter allows requests under limit", async () => {
  const app = new Deso();

  app.use(rateLimiter({ windowMs: 60000, max: 5 }));
  app.get("/test", () => new Response("ok"));

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/test`);
    assertEquals(res.status, 200);
    assertEquals(await res.text(), "ok");
  });
});

Deno.test("rateLimiter sets rate limit headers on first request", async () => {
  const app = new Deso();

  app.use(rateLimiter({ windowMs: 60000, max: 10 }));
  app.get("/test", () => new Response("ok"));

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/test`);
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("RateLimit-Limit"), "10");
    assertEquals(res.headers.get("RateLimit-Remaining"), "9");
    assert(res.headers.get("RateLimit-Reset"));
  });
});

Deno.test("rateLimiter blocks when limit exceeded", async () => {
  const app = new Deso();

  app.use(rateLimiter({ windowMs: 60000, max: 2 }));
  app.get("/test", () => new Response("ok"));

  await desoServer(app, async (baseUrl) => {
    await fetch(`${baseUrl}/test`);
    await fetch(`${baseUrl}/test`);
    const res = await fetch(`${baseUrl}/test`);
    assertEquals(res.status, 429);
    assertEquals(await res.text(), "Too many requests, please try again later");
    assert(res.headers.get("Retry-After"));
  });
});

Deno.test("rateLimiter shows decreasing remaining count", async () => {
  const app = new Deso();

  app.use(rateLimiter({ windowMs: 60000, max: 3 }));
  app.get("/test", () => new Response("ok"));

  await desoServer(app, async (baseUrl) => {
    const r1 = await fetch(`${baseUrl}/test`);
    assertEquals(r1.headers.get("RateLimit-Remaining"), "2");

    const r2 = await fetch(`${baseUrl}/test`);
    assertEquals(r2.headers.get("RateLimit-Remaining"), "1");

    const r3 = await fetch(`${baseUrl}/test`);
    assertEquals(r3.headers.get("RateLimit-Remaining"), "0");

    const r4 = await fetch(`${baseUrl}/test`);
    assertEquals(r4.status, 429);
    assertEquals(r4.headers.get("RateLimit-Remaining"), "0");
  });
});

Deno.test("rateLimiter with custom key function", async () => {
  const app = new Deso();

  app.use(
    rateLimiter({
      windowMs: 60000,
      max: 1,
      key: () => "single-key",
    }),
  );
  app.get("/test", () => new Response("ok"));

  await desoServer(app, async (baseUrl) => {
    const r1 = await fetch(`${baseUrl}/test`);
    assertEquals(r1.status, 200);

    const r2 = await fetch(`${baseUrl}/test`);
    assertEquals(r2.status, 429);
  });
});

Deno.test("rateLimiter with custom message and status", async () => {
  const app = new Deso();

  app.use(
    rateLimiter({
      windowMs: 60000,
      max: 1,
      message: "custom limit message",
      statusCode: 503,
    }),
  );
  app.get("/test", () => new Response("ok"));

  await desoServer(app, async (baseUrl) => {
    await fetch(`${baseUrl}/test`);
    const res = await fetch(`${baseUrl}/test`);
    assertEquals(res.status, 503);
    assertEquals(await res.text(), "custom limit message");
  });
});

Deno.test("rateLimiter resets after window expires", async () => {
  const app = new Deso();

  app.use(rateLimiter({ windowMs: 50, max: 1 }));
  app.get("/test", () => new Response("ok"));

  await desoServer(app, async (baseUrl) => {
    await fetch(`${baseUrl}/test`);
    const blocked = await fetch(`${baseUrl}/test`);
    assertEquals(blocked.status, 429);

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 60));

    const allowed = await fetch(`${baseUrl}/test`);
    assertEquals(allowed.status, 200);
  });
});
