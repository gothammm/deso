import { assertEquals } from "https://deno.land/std@0.181.0/testing/asserts.ts";
import { Deso } from "../mod.ts";
import { desoServer } from "./fixtures.ts";

Deno.test("hits a simple GET endpoint", async () => {
  const app = new Deso();
  const expectedResponse = "test";
  app.get("/resource", () => new Response(expectedResponse));

  await desoServer(app, async (baseUrl) => {
    const response = await fetch(baseUrl + "/resource");
    const responseCode = response.status;
    const body = await response.text();
    assertEquals(responseCode, 200);
    assertEquals(expectedResponse, body);
  });
});

Deno.test("path param value is loaded onto context", async () => {
  const app = new Deso();
  const responseText = (name: string) => `Hello ${name}`;
  app.get(
    "/name/:name",
    (context) => new Response(responseText(context.param("name")!)),
  );
  await desoServer(app, async (baseUrl) => {
    const nameParam = "john";
    const response = await fetch(baseUrl + "/name/" + nameParam);
    const responseCode = response.status;
    const body = await response.text();
    assertEquals(responseCode, 200);
    assertEquals(responseText(nameParam), body);
  });
});

Deno.test(
  "path param value that matches the regex pattern is loaded onto context",
  async () => {
    const app = new Deso();
    const responseText = (name: string) => `Hello ${name}`;
    app.get(
      "/name/:name([a-zA-Z]+)",
      (context) => new Response(responseText(context.param("name")!)),
    );
    await desoServer(app, async (baseUrl) => {
      const nameParam = "john";
      const response = await fetch(baseUrl + "/name/" + nameParam);
      const responseCode = response.status;
      const body = await response.text();
      assertEquals(responseCode, 200);
      assertEquals(responseText(nameParam), body);
    });
  },
);

Deno.test(
  "path param value that does not regex pattern is not loaded onto context",
  async () => {
    const app = new Deso();
    const responseText = (name: string) => `Hello ${name}`;
    app.get(
      "/name/:name([a-zA-Z]+)",
      (context) => new Response(responseText(context.param("name") ?? "")),
    );
    await desoServer(app, async (baseUrl) => {
      const nameParam = "123";
      const response = await fetch(baseUrl + "/name/" + nameParam);
      const responseCode = response.status;
      assertEquals(responseCode, 404);
      await response.body?.cancel();
    });
  },
);

Deno.test(
  "`get` runs route level middlewares before the handler",
  async () => {
    const app = new Deso();
    const responseText = (rid: string) => `Hello from request id: ${rid}`;

    app.get(
      "/rid/:rid",
      (context): undefined => {
        context.set("request_id", context.param("rid"));
        return;
      },
      (context): undefined => {
        context.header("request_id", context.get("request_id")!);
        return;
      },
      (context) => {
        return context.text(responseText(context.get("request_id")!));
      },
    );
    await desoServer(app, async (baseUrl) => {
      const requestId = crypto.randomUUID();
      const response = await fetch(baseUrl + "/rid/" + requestId);
      const responseCode = response.status;
      assertEquals(responseCode, 200);
      assertEquals(responseText(requestId), await response.text());
      assertEquals(requestId, response.headers.get("request_id"));
    });
  },
);
