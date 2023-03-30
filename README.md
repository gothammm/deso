## Deso

> A simple & fast web framework for deno


### Quick Start

```typescript
// main.ts
import { Deso } from "https://deno.land/x/deso/mod.ts";

const app = new Deso();

app.get("/", (context) => context.text('Hello World'));

await app.serve({ port: 3000 });
```
