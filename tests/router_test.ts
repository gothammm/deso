import { assert, assertEquals, assertExists } from "./deps.ts";
import { DesoRouter } from "../lib/_router.ts";
import { DesoContext } from "../lib/context.ts";
import type { ConnInfo } from "./deps.ts";

const dummyRequest = (path: string) => new Request(`https://dummy.com${path}`);

Deno.test({
  name: "returns a matching handler for a simple route",
  fn: async () => {
    // given
    const router = new DesoRouter();
    const expectedResponseText = "Hello there!";
    router.on("GET", "/hello", () => new Response(expectedResponseText));
    router.on("GET", "/hell-yeah", () => new Response("Hell Yeah!"));

    // when
    const request = dummyRequest("/hello");
    const matchResult = router.match(request.url, "GET");

    // then
    assertExists(matchResult.node?.handler);
    const response = await matchResult.node?.handler(
      new DesoContext(request, {} as ConnInfo),
    );
    assertEquals(await response.text(), expectedResponseText);
  },
});

Deno.test("returns undefined handler if no matching route is found", () => {
  // given
  const router = new DesoRouter();
  const expectedResponseText = "Hello there!";
  router.on("GET", "/hello", () => new Response(expectedResponseText));
  router.on("GET", "/hell-yeah", () => new Response("Hell Yeah!"));

  // when
  const request = dummyRequest("/test");
  const matchResult = router.match(request.url, "GET");

  // then
  assert(matchResult.node === undefined);
});

Deno.test({
  name: "returns handler with params for a matching route with path params",
  fn: async () => {
    // given
    const router = new DesoRouter();
    const expectedResponseText = (text?: string) => `Hello there! - ${text}`;
    router.on(
      "GET",
      "/hello/:name",
      (c) => new Response(expectedResponseText(c.param("name"))),
    );
    router.on("GET", "/hell-yeah", () => new Response("Hell Yeah!"));

    // when
    const request = dummyRequest("/hello/peter");
    const matchResult = router.match(request.url, "GET");

    // then
    assertExists(matchResult.node?.handler);
    assertEquals(
      matchResult.params,
      new Map([["PATH:name" as const, "peter"]]),
    );
    const response = await matchResult.node?.handler(
      new DesoContext(request, {} as ConnInfo, {
        routeParams: matchResult.params!,
      }),
    );
    assertEquals(await response.text(), expectedResponseText("peter"));
  },
});

Deno.test({
  name: "returns handler with params for longer routes with path params",
  fn: async () => {
    // given
    const router = new DesoRouter();
    const expectedResponseText = (text?: string) => `Hello there! - ${text}`;
    router.on(
      "GET",
      "/hello/:name/id/:id",
      (c) =>
        new Response(
          expectedResponseText(`${c.param("name")}:${c.param("id")}`),
        ),
    );
    router.on("GET", "/hell-yeah", () => new Response("Hell Yeah!"));

    // when
    const request = dummyRequest("/hello/peter/id/2");
    const matchResult = router.match(request.url, "GET");

    // then
    assertExists(matchResult.node?.handler);
    assertEquals(
      matchResult.params,
      new Map([
        ["PATH:name" as const, "peter"],
        ["PATH:id" as const, "2"],
      ]),
    );
    const response = await matchResult.node?.handler(
      new DesoContext(request, {} as ConnInfo, {
        routeParams: matchResult.params!,
      }),
    );
    assertEquals(await response.text(), expectedResponseText("peter:2"));
  },
});
