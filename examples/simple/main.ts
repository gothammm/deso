import { Deso } from "../../mod.ts";

const app = new Deso();

app.get("/hello", (context) => {
  return context.text("Hello World!");
});

await app.serve({ port: 3000 });
