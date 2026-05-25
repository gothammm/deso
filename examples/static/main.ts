import { Deso, staticMiddleware } from "../../mod.ts";

const app = new Deso();

app.get("/*", staticMiddleware({ assetPath: "./assets" }));

await app.serve({ port: 3000 });
