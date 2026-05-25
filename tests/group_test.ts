import { Deso } from "../mod.ts";
import { assertEquals } from "./deps.ts";
import { desoServer } from "./fixtures.ts";

Deno.test("route group applies prefix to all routes", async () => {
  const app = new Deso();

  app.group("/api", () => {
    app.get("/users", () => new Response("users list"));
    app.get("/posts", () => new Response("posts list"));
  });

  await desoServer(app, async (baseUrl) => {
    const r1 = await fetch(`${baseUrl}/api/users`);
    assertEquals(r1.status, 200);
    assertEquals(await r1.text(), "users list");

    const r2 = await fetch(`${baseUrl}/api/posts`);
    assertEquals(r2.status, 200);
    assertEquals(await r2.text(), "posts list");

    const r3 = await fetch(`${baseUrl}/users`);
    assertEquals(r3.status, 404);
  });
});

Deno.test("route group with middleware applies to all inner routes", async () => {
  const app = new Deso();
  const log: string[] = [];

  app.group(
    "/admin",
    // deno-lint-ignore require-await
    async (_, next) => {
      log.push("auth-check");
      return next();
    },
    () => {
      app.get("/dashboard", () => {
        log.push("dashboard");
        return new Response("admin dashboard");
      });
      app.get("/settings", () => {
        log.push("settings");
        return new Response("admin settings");
      });
    },
  );

  await desoServer(app, async (baseUrl) => {
    const r1 = await fetch(`${baseUrl}/admin/dashboard`);
    assertEquals(r1.status, 200);
    assertEquals(log, ["auth-check", "dashboard"]);

    const r2 = await fetch(`${baseUrl}/admin/settings`);
    assertEquals(r2.status, 200);
    assertEquals(log, ["auth-check", "dashboard", "auth-check", "settings"]);
  });
});

Deno.test("route group middleware can short-circuit all routes", async () => {
  const app = new Deso();

  app.group(
    "/protected",
    () => new Response("forbidden", { status: 403 }),
    () => {
      app.get("/data", () => new Response("secret"));
    },
  );

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/protected/data`);
    assertEquals(res.status, 403);
  });
});

Deno.test("nested route groups combine prefixes", async () => {
  const app = new Deso();

  app.group("/api", () => {
    app.group("/v1", () => {
      app.get("/users", () => new Response("api v1 users"));
    });
    app.group("/v2", () => {
      app.get("/users", () => new Response("api v2 users"));
    });
  });

  await desoServer(app, async (baseUrl) => {
    const r1 = await fetch(`${baseUrl}/api/v1/users`);
    assertEquals(await r1.text(), "api v1 users");

    const r2 = await fetch(`${baseUrl}/api/v2/users`);
    assertEquals(await r2.text(), "api v2 users");

    const r3 = await fetch(`${baseUrl}/api/v1/users`);
    assertEquals(r3.status, 200);
  });
});

Deno.test("route group with param prefix", async () => {
  const app = new Deso();

  app.group("/:tenant", () => {
    app.get("/items", (ctx) => {
      return ctx.json({ tenant: ctx.param("tenant") });
    });
  });

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/acme/items`);
    assertEquals(await res.json(), { tenant: "acme" });
  });
});

Deno.test("group prefix with trailing content works correctly", async () => {
  const app = new Deso();

  app.group("/v1", () => {
    app.get("/resource", () => new Response("v1 resource"));
  });

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/v1/resource`);
    assertEquals(await res.text(), "v1 resource");
  });
});

Deno.test("global middleware + route group middleware + route middleware", async () => {
  const app = new Deso();
  const log: string[] = [];

  // deno-lint-ignore require-await
  app.use(async (_, next) => {
    log.push("global");
    return next();
  });

  app.group(
    "/api",
    // deno-lint-ignore require-await
    async (_, next) => {
      log.push("group");
      return next();
    },
    () => {
      app.get(
        "/data",
        // deno-lint-ignore require-await
        async (_, next) => {
          log.push("route");
          return next();
        },
        () => {
          log.push("handler");
          return new Response("ok");
        },
      );
    },
  );

  await desoServer(app, async (baseUrl) => {
    await fetch(`${baseUrl}/api/data`);
    assertEquals(log, ["global", "group", "route", "handler"]);
  });
});
