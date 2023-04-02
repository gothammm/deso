import { Deso } from "../../mod.ts";

const app = new Deso();

app.get("/hello/:name", (context) => {
  return context.json({
    name: context.param("name"),
  });
});

app.get("/hello/:name/location/:location", (context) => {
  return context.json({
    name: context.param("name"),
    location: context.param("location"),
  });
});

await app.serve({ port: 3000 });
