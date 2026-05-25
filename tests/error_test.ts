import { Deso } from "../mod.ts";
import { assertEquals } from "./deps.ts";
import { desoServer } from "./fixtures.ts";

Deno.test("handler that throws is caught and returns 500", async () => {
  const app = new Deso();

  app.get("/crash", () => {
    throw new Error("something went wrong");
  });

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/crash`);
    assertEquals(res.status, 500);
    assertEquals(await res.text(), "something went wrong");
  });
});

Deno.test("middleware that throws is caught", async () => {
  const app = new Deso();

  app.use(() => {
    throw new Error("middleware error");
  });

  app.get("/test", () => new Response("ok"));

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/test`);
    assertEquals(res.status, 500);
  });
});

Deno.test("next() that throws in middleware is caught by outer middleware", async () => {
  const app = new Deso();

  app.get(
    "/error-chain",
    async (_, next) => {
      try {
        return await next();
      } catch {
        return new Response("handled", { status: 502 });
      }
    },
    () => {
      throw new Error("deep error");
    },
  );

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/error-chain`);
    assertEquals(res.status, 502);
    assertEquals(await res.text(), "handled");
  });
});

Deno.test("middleware return response without next() stops chain", async () => {
  const app = new Deso();
  let handlerCalled = false;

  app.use(() => new Response("blocked", { status: 403 }));

  app.get("/test", () => {
    handlerCalled = true;
    return new Response("ok");
  });

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/test`);
    assertEquals(res.status, 403);
    assertEquals(handlerCalled, false);
  });
});

Deno.test("error with .status property uses that status code", async () => {
  const app = new Deso();

  app.get("/bad-request", () => {
    const err = new Error("invalid input") as Error & { status: number };
    err.status = 400;
    throw err;
  });

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/bad-request`);
    assertEquals(res.status, 400);
    assertEquals(await res.text(), "invalid input");
  });
});

Deno.test("AsyncLocalStorage provides per-request context", async () => {
  const app = new Deso({ enableAsyncLocalStorage: true });

  // deno-lint-ignore require-await
  app.use(async (_, next) => {
    app.als?.set(
      "request_count",
      ((app.als?.get("request_count") as number) ?? 0) + 1,
    );
    return next();
  });

  app.get("/check", (ctx) => {
    const count = app.als?.get("request_count");
    return ctx.text(`count: ${count}`);
  });

  await desoServer(app, async (baseUrl) => {
    const r1 = await fetch(`${baseUrl}/check`);
    assertEquals(await r1.text(), "count: 1");

    const r2 = await fetch(`${baseUrl}/check`);
    assertEquals(await r2.text(), "count: 1");
  });
});
