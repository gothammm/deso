import type { DesoRequest } from "../../mod.ts";
import { Deso } from "../../mod.ts";

const app = new Deso();

app.get(
  "/hello",
  (_request: DesoRequest) =>
    new Response(`Hello World`)
);

await app.serve({ port: 3000 });
