import { serve } from "https://deno.land/std@0.181.0/http/mod.ts";
import type { DesoRequest } from "../../mod.ts";
import { Deso, middlewares } from "../../mod.ts";

const app = new Deso();


app.use(new middlewares.StaticMiddleware('/*', './assets'))
app.get(
  "/hello",
  (_request: DesoRequest) =>
    new Response(`Hello World`)
);

await serve(app.handle, { port: 3000 });
