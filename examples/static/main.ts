import type { DesoRequest } from "../../mod.ts";
import { Deso, middlewares } from "../../mod.ts";

const app = new Deso();

app.before(new middlewares.StaticMiddleware("/*", "./assets"));
app.get(
  "/hello",
  (_request: DesoRequest) => {
    return new Response(`Hello World`);
  },
);

await app.serve({ port: 3000 });
