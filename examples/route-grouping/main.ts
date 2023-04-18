import { Deso } from "../../mod.ts";

const app = new Deso();

app.group(
  "/id",
  // Group level middleware.
  (context) => {
    context.set("request-id", crypto.randomUUID());
    return Promise.resolve(undefined);
  },
  () => {
    app.get("/:id/rest", (context) => {
      return new Response("Rest" + context.param("id"));
    });
    app.get("/:id/rest2", (context) => {
      return new Response("Rest" + context.param("id"));
    });
    app.post("/:id/add", (context) => {
      return new Response("Added" + context.param("id"));
    });
  },
);

await app.serve({ port: 3000 });
