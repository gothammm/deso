# Deso

> A simple & fast web framework for deno

## Table of content

- [Quick Start](#quick-start)
- [Features](#features)
- [The `Deso` class](#the-deso-class)

## Quick Start

```ts
// main.ts
import { Deso } from "https://deno.land/x/deso/mod.ts";

const app = new Deso();

app.get("/", (context) => context.text("Hello World"));

app.get(
  "/name/:name",
  (context) => context.text(`Hello ${context.param("name")}!`),
);

await app.serve({ port: 3000 });
```

## Features

- ✅ router - handle GET,POST,PUT,PATCH,DELETE
  - ✅ route grouping
  - ✅ path params
  - ❌ query params
- ✅ middlewares
  - ✅ route level middlewares
  - ✅ app level middlewares
  - ✅ route groups level middlewares
- ✅ response - json / text / html / css / js
- ✅ body - json / formdata
- ❌ schema validation

> **Note**: anything marked as ❌ is unavailable at the moment, and is planned /
> to be implemented.

## The `Deso` class

The `Deso` is the entry class, that runs the server, middlewares, define routes.

It class instance exposes the following methods for defining routes.

- `.get`
- `.post`
- `.put`
- `.delete`
- `.patch`

All the above functions take in similar kind of arguments, the first argument is
the path ex: `/hey`, the last argument is the request handler, and any argument
between the path and the handler is always inferred as a middleware handler.
Consider the below example.

```ts
import { Deso } from "https://deno.land/x/deso/mod.ts";

const app = new Deso();

app.get("/hello", (context) => context.text("Hello World"));

// The last argument is always the request handler and expects a response.
// Any handler before the last argument and after the path argument is considered as a middleware handler.
app.get(
  "/stuff-with-middleware",
  (context): Promise<void> => {
    context.header("X-Custom-Header", "stuff");
    return;
  },
  (context) => {
    return context.text("This response has a custom header");
  },
);

app.get(
  "/too-many-middlewares",
  middleware1,
  middleware2,
  middleware3,
  (context) => context.text("This request path has too many middlewares"),
);

await app.serve({ port: 3000 });
```

<em> **NOTE**: The only difference between the request handler (or a
`DesoHandler`) and a middleware handler is, a middleware can choose to return a
`Response` and break the request flow, or return nothing and continue with the
request flow, while the `DesoHandler` must always return a `Response`</em>

So far what we talked about was how to configure middleware at each route level,
that means the middlewares are executed only if there is a route match and is
not arbitrary.

To configure middlewares that runs on each request, you should use the `.before`
function, consider the following example.

```ts
import { Deso } from "https://deno.land/x/deso/mod.ts";

const app = new Deso();

app.before((context) => {
  context.header("x-request-id", crypto.randomUUID());
  return;
});

app.before((context) => {
  context.header("x-custom-header", "stuff");
  return;
});

app.get("/", (context) => context.text("Hello there!"));

app.post("/submit", (context) => context.json({ submit: "ok" }));

await app.serve({ port: 3000 });
```

`.before` registers middlewares that always run <em> **before**</em> a route
match is found, so for a request `curl http://localhost:3000/test` the
registered middlewares in the example run before a matching handler for the
route is found (in this case its a 404)

the idea is to give simple and flexible APIs that lets user define middlewares
their way.

to summarize, use route level middleware for more route focused precursor type
operations, use `.before` to run it for every request irrespective of what the
route responds.

### Lets talk about router.

<em>WIP</em>
