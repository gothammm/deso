import { assertEquals } from "https://deno.land/std@0.181.0/testing/asserts.ts";
import { Deso } from "../mod.ts";
import { desoServer } from "./fixtures.ts";
import { DesoResponse } from "../lib/response.ts";

Deno.test("it should hit a simple get endpoint", async () => {
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

Deno.test("it should respond with json content", async () => {
  const app = new Deso();
  const jsonContent = {
    test: "ok",
    nested: {
      test: "ok",
    },
    list: [{
      test: "ok",
    }],
  };
  app.get("/json", () => DesoResponse.json(jsonContent));

  await desoServer(app, async (baseUrl) => {
    const response = await fetch(baseUrl + "/json");
    const responseCode = response.status;
    const jsonResponse = await response.json();
    assertEquals(responseCode, 200);
    assertEquals(jsonContent, jsonResponse);
  });
});
