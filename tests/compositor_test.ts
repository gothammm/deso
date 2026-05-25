import { compose } from "../lib/compositor.ts";
import { DesoContext } from "../lib/context.ts";
import type { DesoHandler, DesoMiddleware } from "../lib/types.ts";
import { assert, assertEquals } from "./deps.ts";

const makeCtx = () => new DesoContext(new Request("https://test.com"));

Deno.test("compose with no middlewares calls handler directly", async () => {
  const handler: DesoHandler = () => new Response("from handler");
  const pipeline = compose([], handler);
  const res = await pipeline(makeCtx());
  assertEquals(await res.text(), "from handler");
});

Deno.test("compose runs middlewares in order", async () => {
  const order: number[] = [];
  const mw1: DesoMiddleware = async (_, next) => {
    order.push(1);
    const res = await next();
    order.push(4);
    return res;
  };
  const mw2: DesoMiddleware = async (_, next) => {
    order.push(2);
    const res = await next();
    order.push(3);
    return res;
  };
  const handler: DesoHandler = () => {
    order.push(5);
    return new Response("done");
  };

  const pipeline = compose([mw1, mw2], handler);
  await pipeline(makeCtx());
  assertEquals(order, [1, 2, 5, 3, 4]);
});

Deno.test("compose middleware can short-circuit by not calling next", async () => {
  const mw: DesoMiddleware = () =>
    new Response("short-circuit", { status: 401 });
  const handler: DesoHandler = () =>
    new Response("should not reach", { status: 200 });

  const pipeline = compose([mw], handler);
  const res = await pipeline(makeCtx());
  assertEquals(res.status, 401);
  assertEquals(await res.text(), "short-circuit");
});

Deno.test("compose middleware can modify response after next", async () => {
  const mw: DesoMiddleware = async (_, next) => {
    const res = await next();
    const body = await res.text();
    return new Response(`${body} (modified)`, res);
  };
  const handler: DesoHandler = () => new Response("original");

  const pipeline = compose([mw], handler);
  const res = await pipeline(makeCtx());
  assertEquals(await res.text(), "original (modified)");
});

Deno.test("compose middleware can wrap error handling", async () => {
  const mw: DesoMiddleware = async (_, next) => {
    try {
      return await next();
    } catch {
      return new Response("caught error", { status: 500 });
    }
  };
  const handler: DesoHandler = () => {
    throw new Error("handler error");
  };

  const pipeline = compose([mw], handler);
  const res = await pipeline(makeCtx());
  assertEquals(res.status, 500);
  assertEquals(await res.text(), "caught error");
});

Deno.test("compose middleware can set context values before next", async () => {
  // deno-lint-ignore require-await
  const mw: DesoMiddleware = async (ctx, next) => {
    ctx.set("started", true);
    return next();
  };
  const handler: DesoHandler = (ctx) => {
    assert(ctx.get("started"));
    return new Response("ok");
  };

  const pipeline = compose([mw], handler);
  const res = await pipeline(makeCtx());
  assertEquals(await res.text(), "ok");
});

Deno.test("compose with three middlewares executes in correct order", async () => {
  const log: string[] = [];
  const mw1: DesoMiddleware = async (_, next) => {
    log.push("1-before");
    const res = await next();
    log.push("1-after");
    return res;
  };
  const mw2: DesoMiddleware = async (_, next) => {
    log.push("2-before");
    const res = await next();
    log.push("2-after");
    return res;
  };
  const mw3: DesoMiddleware = async (_, next) => {
    log.push("3-before");
    const res = await next();
    log.push("3-after");
    return res;
  };
  const handler: DesoHandler = () => {
    log.push("handler");
    return new Response("ok");
  };

  const pipeline = compose([mw1, mw2, mw3], handler);
  await pipeline(makeCtx());
  assertEquals(log, [
    "1-before",
    "2-before",
    "3-before",
    "handler",
    "3-after",
    "2-after",
    "1-after",
  ]);
});
