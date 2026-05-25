import { Deso, staticMiddleware } from "../mod.ts";
import { assertEquals } from "./deps.ts";
import { desoServer } from "./fixtures.ts";

Deno.test("staticMiddleware missing file returns 404", async () => {
  const app = new Deso();

  app.get("/*", staticMiddleware({ assetPath: "./nonexistent" }));

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/test.txt`);
    assertEquals(res.status, 404);
  });
});

Deno.test("staticMiddleware serves deps.ts using absolute path", async () => {
  const app = new Deso();
  const absPath = `${Deno.cwd()}/tests`;

  app.get("/*", staticMiddleware({ assetPath: absPath }));

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/deps.ts`);
    assertEquals(res.status, 200);
  });
});

Deno.test("staticMiddleware serves deps.ts using relative path", async () => {
  const app = new Deso();

  app.get("/*", staticMiddleware({ assetPath: "./tests" }));

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/deps.ts`);
    if (res.status !== 200) {
      const body = await res.text();
      console.log("DEBUG status:", res.status, "body:", body);
    }
    assertEquals(res.status, 200);
  });
});

Deno.test("staticMiddleware serves files with dot assetPath", async () => {
  const app = new Deso();

  app.get("/*", staticMiddleware({ assetPath: "." }));

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/tests/deps.ts`);
    assertEquals(res.status, 200);
  });
});

Deno.test("staticMiddleware with Cache-Control header", async () => {
  const app = new Deso();

  app.get(
    "/*",
    staticMiddleware({
      assetPath: `${Deno.cwd()}/tests`,
      cacheControl: "public, max-age=3600",
    }),
  );

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/deps.ts`);
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("Cache-Control"), "public, max-age=3600");
  });
});

Deno.test("staticMiddleware without Cache-Control", async () => {
  const app = new Deso();

  app.get("/*", staticMiddleware({ assetPath: `${Deno.cwd()}/tests` }));

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/deps.ts`);
    assertEquals(res.headers.get("Cache-Control"), null);
  });
});

Deno.test("staticMiddleware returns 404 for directory without index.html", async () => {
  const app = new Deso();

  app.get("/*", staticMiddleware({ assetPath: `${Deno.cwd()}/tests` }));

  await desoServer(app, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/`);
    assertEquals(res.status, 404);
  });
});
