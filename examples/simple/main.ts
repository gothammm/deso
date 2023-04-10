import { Deso } from "../../mod.ts";

const app = new Deso();

app.get('*', (context) => {
  return context.text("Hello World! X");
});

await app.serve({ port: 3000 });
