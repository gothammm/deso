import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.181.0/testing/asserts.ts";
import { DesoRouter } from "../lib/router.ts";
import { DesoContext } from "../lib/context.ts";
import { ConnInfo } from "https://deno.land/std@0.181.0/http/server.ts";

const dummyRequest = (path: string) => new Request(`https://dummy.com${path}`);

Deno.test("returns a matching handler for a simple route", async () => {
  // given
  const router = new DesoRouter();
  const expectedResponseText = "Hello there!";
  router.add("/hello", () => new Response(expectedResponseText));
  router.add("/hell-yeah", () => new Response("Hell Yeah!"));

  // when
  const request = dummyRequest("/hello");
  const [path, handler] = router.match(request.url);

  // then
  assertExists(handler);
  assertEquals(path, new URL(request.url).pathname);
  const response = await handler(new DesoContext(request, {} as ConnInfo));
  assertEquals(await response.text(), expectedResponseText);
});

Deno.test("returns undefined handler if no matching route is found", () => {
  // given
  const router = new DesoRouter();
  const expectedResponseText = "Hello there!";
  router.add("/hello", () => new Response(expectedResponseText));
  router.add("/hell-yeah", () => new Response("Hell Yeah!"));

  // when
  const request = dummyRequest("/test");
  const [path, handler] = router.match(request.url);

  // then
  assert(handler === undefined);
  assertEquals(path, new URL(request.url).pathname);
});

Deno.test(
  "returns handler with params for a matching route with path params",
  async () => {
    // given
    const router = new DesoRouter();
    const expectedResponseText = (text?: string) => `Hello there! - ${text}`;
    router.add(
      "/hello/:name",
      (c) => new Response(expectedResponseText(c.param("name")))
    );
    router.add("/hell-yeah", () => new Response("Hell Yeah!"));

    // when
    const request = dummyRequest("/hello/peter");
    const [path, handler, params] = router.match(request.url);

    // then
    assertExists(handler);
    assertEquals(path, new URL(request.url).pathname);
    assertEquals(params, new Map([["name", "peter"]]));
    const response = await handler(
      new DesoContext(request, {} as ConnInfo, { routeParams: params })
    );
    assertEquals(await response.text(), expectedResponseText("peter"));
  }
);

Deno.test(
  "returns handler with params for longer routes with path params",
  async () => {
    // given
    const router = new DesoRouter();
    const expectedResponseText = (text?: string) => `Hello there! - ${text}`;
    router.add(
      "/hello/:name/id/:id",
      (c) =>
        new Response(
          expectedResponseText(`${c.param("name")}:${c.param("id")}`)
        )
    );
    router.add("/hell-yeah", () => new Response("Hell Yeah!"));

    // when
    const request = dummyRequest("/hello/peter/id/2");
    const [path, handler, params] = router.match(request.url);

    // then
    assertExists(handler);
    assertEquals(path, new URL(request.url).pathname);
    assertEquals(
      params,
      new Map([
        ["name", "peter"],
        ["id", "2"],
      ])
    );
    const response = await handler(
      new DesoContext(request, {} as ConnInfo, { routeParams: params })
    );
    assertEquals(await response.text(), expectedResponseText("peter:2"));
  }
);
