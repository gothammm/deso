import { Deso } from "../../mod.ts";

const app = new Deso({ enableAsyncLocalStorage: true });

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

app.get("*", (context) =>
  context.json(
    {
      message: "404 - Not Found",
    },
    404,
  ));

await app.serve({ port: 3000 });
