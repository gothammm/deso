import { Deso } from "../../mod.ts";

const app = new Deso();

app.get("/hello", (context) => context.text("Hello"));

app.get("/hello/:name", (context) => {
  return context.text("hello " + context.param("name"));
});

app.get("/hello/:name/location/:location", (context) => {
  return context.text(
    "Hello " + context.param("name") + " from " + context.param("location"),
  );
});

await app.serve({ port: 3000 });
