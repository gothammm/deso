import { Deso } from "../../mod.ts";

const app = new Deso();

app.get("/", context => context.text("Hello world"));
app.get("/hello", (context) => {
  return context.text("hello world!");
});

app.get("*", () => new Response("404 - Not Found", { status: 404 }));

await app.serve({ port: 3000 });
