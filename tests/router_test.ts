import { assert, assertEquals, assertExists } from "./deps.ts";
import { DesoRouter } from "../lib/router.ts";
import { DesoContext } from "../lib/context.ts";
import { parseUrl } from "../lib/url.ts";

const dummyRequest = (path: string) => new Request(`https://dummy.com${path}`);

Deno.test("returns a matching handler for a simple route", async () => {
  // given
  const router = new DesoRouter();
  const expectedResponseText = "Hello there!";
  router.add("/hello", () => new Response(expectedResponseText));
  router.add("/hell-yeah", () => new Response("Hell Yeah!"));

  // when
  const request = dummyRequest("/hello");
  const [handler] = router.match(parseUrl(request.url)?.pathname ?? "");

  // then
  assertExists(handler);
  const response = await handler(new DesoContext(request));
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
  const [handler] = router.match(parseUrl(request.url)?.pathname ?? "");

  // then
  assert(handler === undefined);
});

Deno.test(
  "returns handler with params for a matching route with path params",
  async () => {
    // given
    const router = new DesoRouter();
    const expectedResponseText = (text?: string) => `Hello there! - ${text}`;
    router.add(
      "/hello/:name",
      (c) => new Response(expectedResponseText(c.param("name"))),
    );
    router.add("/hell-yeah", () => new Response("Hell Yeah!"));

    // when
    const request = dummyRequest("/hello/peter");
    const [handler, params] = router.match(
      parseUrl(request.url)?.pathname ?? "",
    );

    // then
    assertExists(handler);
    assertEquals(params, new Map([["name", "peter"]]));
    const response = await handler(
      new DesoContext(request, { routeParams: params }),
    );
    assertEquals(await response.text(), expectedResponseText("peter"));
  },
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
          expectedResponseText(`${c.param("name")}:${c.param("id")}`),
        ),
    );
    router.add("/hell-yeah", () => new Response("Hell Yeah!"));

    // when
    const request = dummyRequest("/hello/peter/id/2");
    const [handler, params] = router.match(
      parseUrl(request.url)?.pathname ?? "",
    );

    // then
    assertExists(handler);
    assertEquals(
      params,
      new Map([
        ["name", "peter"],
        ["id", "2"],
      ]),
    );
    const response = await handler(
      new DesoContext(request, { routeParams: params }),
    );
    assertEquals(await response.text(), expectedResponseText("peter:2"));
  },
);
