# API Reference

## Deso

Main application class. `import { Deso } from "jsr:@deso/core"`

**Constructor:**

```ts
new Deso(options?: { enableAsyncLocalStorage?: boolean })
```

**Methods:**

| Method    | Signature                                | Description                                 |
| --------- | ---------------------------------------- | ------------------------------------------- |
| `get`     | `<Path>(path, ...handlers)`              | Register GET route                          |
| `post`    | `<Path>(path, ...handlers)`              | Register POST route                         |
| `put`     | `<Path>(path, ...handlers)`              | Register PUT route                          |
| `patch`   | `<Path>(path, ...handlers)`              | Register PATCH route                        |
| `delete`  | `<Path>(path, ...handlers)`              | Register DELETE route                       |
| `head`    | `<Path>(path, ...handlers)`              | Register HEAD route                         |
| `options` | `<Path>(path, ...handlers)`              | Register OPTIONS route                      |
| `any`     | `<Path>(path, ...handlers)`              | Register route for all HTTP methods         |
| `use`     | `(...middlewares)`                       | Register global middleware                  |
| `ws`      | `<Path>(path, ...middlewares, handlers)` | Register WebSocket endpoint                 |
| `group`   | `(prefix, ...middlewares, fn)`           | Create route group with optional middleware |
| `serve`   | `(options: Deno.ServeOptions)`           | Start HTTP server                           |
| `fetch`   | `(request: Request)`                     | Process request (for testing)               |
| `als`     | property                                 | AsyncLocalStorage store                     |

## DesoContext

Request context passed to every handler and middleware.

**Properties:**

| Property | Type                   | Description            |
| -------- | ---------------------- | ---------------------- |
| `store`  | `Map<string, unknown>` | Per-request data store |

**Methods:**

| Method   | Signature                                       | Description               |
| -------- | ----------------------------------------------- | ------------------------- |
| `req`    | `() => Request`                                 | Original request          |
| `param`  | `<T>(key: string) => T \| undefined`            | Route parameter           |
| `query`  | `<T>(key: string) => T \| undefined`            | Query parameter           |
| `header` | `(key: string) => string \| undefined`          | Read request header       |
| `header` | `(key: string, value: string, opts?) => void`   | Set response header       |
| `set`    | `<T>(key: string, value: T) => void`            | Store per-request data    |
| `get`    | `<T>(key: string) => T \| undefined`            | Retrieve per-request data |
| `body`   | `("json") => Promise<Record<string, unknown>>`  | Parse JSON body           |
| `body`   | `("text") => Promise<string>`                   | Read body as text         |
| `body`   | `("form") => Promise<FormData>`                 | Read body as FormData     |
| `json`   | `(data, status?) => Response`                   | JSON response             |
| `text`   | `(value, status?) => Response`                  | Text response             |
| `html`   | `(value, status?) => Response`                  | HTML response             |
| `stream` | `(readable, status?, contentType?) => Response` | Streaming response        |
| `oops`   | `(value, status?) => Response`                  | Error response            |

## DesoRouter

Trie-based router. `import { DesoRouter } from "jsr:@deso/core"`

```ts
const router = new DesoRouter<Path>();
router.add(path, handler);
router.match(pathname); // returns [handler | undefined, params, pathPattern]
```

## Types

| Type                   | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `DesoHandler<Path>`    | Route handler function signature               |
| `DesoMiddleware<Path>` | Middleware function signature                  |
| `HttpMethod`           | Union of all HTTP methods                      |
| `Next`                 | `() => Promise<Response>`                      |
| `ParamKeys<Path>`      | Extract param names from path string as union  |
| `JSONValue`            | JSON-compatible value type                     |
| `RouteParams`          | Route parameters (`Map<string, unknown>`)      |
| `SearchParams`         | URL search parameters (`Map<string, unknown>`) |

## compose

Middleware composition utility. `import { compose } from "jsr:@deso/core"`

```ts
compose(middlewares: DesoMiddleware[], handler: DesoHandler): (context) => Promise<Response>
```

## Middlewares

### requestId

```ts
requestId(key?: string): DesoMiddleware
```

Adds a UUID request ID. Default header key: `x-request-id`.

### cors

```ts
cors(options?: CorsOptions): DesoMiddleware
```

| Option           | Default | Description                                 |
| ---------------- | ------- | ------------------------------------------- |
| `origin`         | `"*"`   | Allowed origin (string, array, or function) |
| `methods`        | All     | Allowed HTTP methods                        |
| `allowedHeaders` | `[]`    | Allowed request headers                     |
| `exposedHeaders` | `[]`    | Exposed response headers                    |
| `credentials`    | `false` | Allow credentials                           |
| `maxAge`         | `86400` | Preflight cache duration                    |

### logger

```ts
logger(options?: LoggerOptions): DesoMiddleware
```

| Option   | Description                           |
| -------- | ------------------------------------- |
| `format` | Log format (future use)               |
| `writer` | Output writer (default `Deno.stdout`) |

### rateLimiter

```ts
rateLimiter(options?: RateLimiterOptions): DesoMiddleware
```

| Option       | Default         | Description                    |
| ------------ | --------------- | ------------------------------ |
| `windowMs`   | `60000`         | Time window in ms              |
| `max`        | `100`           | Max requests per window        |
| `key`        | IP              | Key function `(req) => string` |
| `message`    | `"Too many..."` | Rate limit message             |
| `statusCode` | `429`           | Rate limit status code         |

### staticMiddleware

```ts
staticMiddleware(options: StaticMiddlewareOptions): DesoHandler
```

| Option         | Description                   |
| -------------- | ----------------------------- |
| `assetPath`    | Directory to serve files from |
| `cacheControl` | Cache-Control header value    |

## Zod

### zValidator

```ts
zValidator(target, schema): DesoMiddleware
```

- `target`: `"json"` | `"query"` | `"params"`
- `schema`: Zod schema
- Validated data stored in ctx under target key

### OpenAPIRegistry

```ts
new OpenAPIRegistry(config: OpenAPIConfig)
registry.register(method, path, operation)
registry.generate() // Returns OpenAPI 3.1 spec
```

| Config    | Description                         |
| --------- | ----------------------------------- |
| `info`    | OpenAPI info object                 |
| `servers` | Server definitions                  |
| `openapi` | OpenAPI version (default `"3.1.0"`) |

### OperationSchema

```ts
{
  summary?: string
  description?: string
  operationId?: string
  tags?: string[]
  parameters?: ParameterObject[]
  requestBody?: { description?, required?, content }
  responses?: Record<string, ResponseObject>
}
```

## WebSocket

### wsHandler

```ts
wsHandler(handlers: WsHandlers): WsHandler
```

### WsHandlers

```ts
{
  open?: (ws: WebSocket, ctx: DesoContext) => void
  message?: (ws: WebSocket, event: MessageEvent, ctx: DesoContext) => void
  close?: (ws: WebSocket, event: CloseEvent, ctx: DesoContext) => void
  error?: (ws: WebSocket, event: Event, ctx: DesoContext) => void
}
```

### WsRoom

```ts
new WsRoom(onEmpty?: () => void)
room.add(socket: WebSocket): void
room.broadcast(data): void
room.size: number
room.sockets(): Set<WebSocket>
```

### WsManager

```ts
const manager = new WsManager()
manager.room(name: string): WsRoom  // creates or returns existing
manager.deleteRoom(name: string): void
```

### wsManager

Global singleton WsManager instance.
