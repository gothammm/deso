import { Deso, middlewares } from "../../mod.ts";

const app = new Deso();

app.before(new middlewares.StaticMiddleware("/*", "./assets"));
app.get("/hello", (_context) => {
  return new Response(`Hello World`);
});

await app.serve({ port: 3000 });
