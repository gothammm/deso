import { Deso, wsManager, WsRoom } from "../mod.ts";
import { assert, assertEquals } from "./deps.ts";

function withWsServer(
  app: Deso,
  fn: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const ac = new AbortController();
  const { signal } = ac;

  return app.serve({
    port: 0,
    signal,
    onListen: async (addr: Deno.NetAddr) => {
      const baseUrl = `http://${addr.hostname}:${addr.port}`;
      await fn(baseUrl);
      ac.abort();
    },
  });
}

Deno.test("WebSocket echo works", async () => {
  const app = new Deso();

  app.ws("/echo", {
    message(ws, event) {
      ws.send(event.data);
    },
  });

  await withWsServer(app, async (baseUrl) => {
    const wsUrl = `${baseUrl.replace("http://", "ws://")}/echo`;
    const ws = new WebSocket(wsUrl);
    const messages: Array<string> = [];

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout")), 2000);
      ws.onopen = () => {
        clearTimeout(timeout);
        ws.send("hello");
      };
      ws.onmessage = (e: MessageEvent) => {
        messages.push(e.data as string);
        ws.close();
      };
      ws.onclose = () => resolve();
      ws.onerror = () => reject(new Error("WS error"));
    });

    assertEquals(messages, ["hello"]);
  });
});

Deno.test("WebSocket middleware short-circuits without upgrade", async () => {
  const app = new Deso();
  const log: Array<string> = [];

  app.ws(
    "/protected",
    // deno-lint-ignore require-await
    async (ctx, next) => {
      log.push("middleware");
      const auth = ctx.header("Authorization");
      if (!auth) {
        return ctx.text("Unauthorized", 401);
      }
      return next();
    },
    {
      open() {
        log.push("open");
      },
    },
  );

  app.get("/status", () => {
    return new Response(JSON.stringify({ log }), {
      headers: { "Content-Type": "application/json" },
    });
  });

  await withWsServer(app, async (baseUrl) => {
    const wsUrl = `${baseUrl.replace("http://", "ws://")}/protected`;
    const ws = new WebSocket(wsUrl);

    const connectFailed = await new Promise<boolean>((resolve) => {
      ws.onerror = () => resolve(true);
      ws.onclose = () => resolve(true);
      setTimeout(() => resolve(false), 1500);
    });

    assertEquals(connectFailed, true);

    const res = await fetch(`${baseUrl}/status`);
    const body = await res.json();
    assert(body.log.includes("middleware"));
    assertEquals(body.log.includes("open"), false);
  });
});

Deno.test("WebSocket middleware passes through with auth", async () => {
  const app = new Deso();
  const log: Array<string> = [];

  app.ws(
    "/protected",
    // deno-lint-ignore require-await
    async (_ctx, next) => {
      log.push("mw");
      return next();
    },
    {
      open() {
        log.push("open");
      },
    },
  );

  await withWsServer(app, async (baseUrl) => {
    const wsUrl = `${baseUrl.replace("http://", "ws://")}/protected`;
    const ws = new WebSocket(wsUrl);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout")), 2000);
      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
      };
      ws.onclose = () => resolve();
      ws.onerror = () => reject(new Error("WS error"));
    });

    assert(log.includes("mw"));
    assert(log.includes("open"));
  });
});

Deno.test("wsHandler standalone usage", async () => {
  const app = new Deso();
  const arr: Array<string> = [];

  const handler = (ctx: { req(): Request }): Response => {
    const { socket, response } = Deno.upgradeWebSocket(ctx.req());
    socket.addEventListener("message", (e: MessageEvent) => {
      arr.push(`from-${e.data}`);
      socket.send(`echo-${e.data}`);
    });
    return response;
  };

  app.get(
    "/raw",
    handler as (ctx: import("../mod.ts").DesoContext) => Response,
  );

  await withWsServer(app, async (baseUrl) => {
    const wsUrl = `${baseUrl.replace("http://", "ws://")}/raw`;
    const ws = new WebSocket(wsUrl);
    const received: Array<string> = [];

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout")), 2000);
      ws.onopen = () => {
        clearTimeout(timeout);
        ws.send("ping");
      };
      ws.onmessage = (e: MessageEvent) => {
        received.push(e.data as string);
        ws.close();
      };
      ws.onclose = () => resolve();
      ws.onerror = () => reject(new Error("WS error"));
    });

    assertEquals(received, ["echo-ping"]);
    assertEquals(arr, ["from-ping"]);
  });
});

Deno.test("WsRoom manages connected sockets", () => {
  const room = new WsRoom();

  assertEquals(room.size, 0);
  assertEquals(room.sockets().size, 0);
});

Deno.test("WsRoom add and broadcast", async () => {
  const app = new Deso();
  const room = wsManager.room("br-test1");

  app.ws("/chat", {
    open(ws) {
      room.add(ws);
    },
  });

  await withWsServer(app, async (baseUrl) => {
    const wsUrl = `${baseUrl.replace("http://", "ws://")}/chat`;
    const c1ready = new Promise<WebSocket>((resolve) => {
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => resolve(ws);
    });
    const c2ready = new Promise<WebSocket>((resolve) => {
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => resolve(ws);
    });
    const [ws1, ws2] = await Promise.all([c1ready, c2ready]);

    // Short wait for room.add to fire
    await new Promise((r) => setTimeout(r, 50));
    assertEquals(room.size, 2);

    const msgs1: Array<string> = [];
    const msgs2: Array<string> = [];
    ws1.onmessage = (e: MessageEvent) => msgs1.push(e.data as string);
    ws2.onmessage = (e: MessageEvent) => msgs2.push(e.data as string);

    room.broadcast("hello all");

    await new Promise((r) => setTimeout(r, 100));

    assertEquals(msgs1, ["hello all"]);
    assertEquals(msgs2, ["hello all"]);

    ws1.close();
    ws2.close();
  });
});

Deno.test("WsManager reuses room instances", () => {
  const room1 = wsManager.room("shared-2");
  const room2 = wsManager.room("shared-2");

  assertEquals(room1, room2);
});

Deno.test("WsRoom with onEmpty callback", () => {
  let emptied = false;
  const room = new WsRoom(() => {
    emptied = true;
  });

  assertEquals(room.size, 0);
  assertEquals(emptied, false);
});
