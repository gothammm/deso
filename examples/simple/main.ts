import { Deso } from "../../mod.ts";

const app = new Deso();

app.get("/hello/:id", (context) => {
  return context.json({
    userId: context.param('id')
  });
});
app.get("/hello", (context) => {
  return context.text('Hello');
});

await app.serve({ port: 3000 });
