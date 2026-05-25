import { Deso } from "../mod.ts";
import { assertEquals } from "./deps.ts";
import { desoServer } from "./fixtures.ts";

Deno.test("hits a simple GET endpoint", async () => {
  const app = new Deso();
  const expectedResponse = "test";
  app.get("/resource", () => new Response(expectedResponse));

  await desoServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/resource`);
    assertEquals(response.status, 200);
    assertEquals(expectedResponse, await response.text());
  });
});

Deno.test("path param value is loaded onto context", async () => {
  const app = new Deso();
  const responseText = (name: string) => `Hello ${name}`;
  app.get(
    "/name/:name",
    (context) => new Response(responseText(context.param("name") as string)),
  );
  await desoServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/name/john`);
    assertEquals(response.status, 200);
    assertEquals(responseText("john"), await response.text());
  });
});

Deno.test("path param value that matches the regex pattern is loaded onto context", async () => {
  const app = new Deso();
  app.get(
    "/name/:name([a-zA-Z]+)",
    (context) => new Response(`Hello ${context.param("name") as string}`),
  );
  await desoServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/name/john`);
    assertEquals(response.status, 200);
    assertEquals("Hello john", await response.text());
  });
});

Deno.test("path param value that does not match regex pattern returns 404", async () => {
  const app = new Deso();
  app.get(
    "/name/:name([a-zA-Z]+)",
    (context) => new Response(`Hello ${context.param("name") ?? ""}`),
  );
  await desoServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/name/123`);
    assertEquals(response.status, 404);
    await response.body?.cancel();
  });
});

Deno.test("route level middlewares run before handler using next() pattern", async () => {
  const app = new Deso();

  app.get(
    "/rid/:rid",
    (context, next) => {
      context.set("request_id", context.param("rid"));
      return next();
    },
    (context, next) => {
      context.header("request_id", context.get("request_id") as string);
      return next();
    },
    (context) => {
      return context.text(
        `Hello from request id: ${context.get("request_id") as string}`,
      );
    },
  );

  await desoServer(app, async (baseUrl) => {
    const requestId = crypto.randomUUID();
    const response = await fetch(`${baseUrl}/rid/${requestId}`);
    assertEquals(response.status, 200);
    assertEquals(`Hello from request id: ${requestId}`, await response.text());
    assertEquals(requestId, response.headers.get("request_id"));
  });
});
