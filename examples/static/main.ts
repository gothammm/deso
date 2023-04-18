import { Deso, middlewares } from "../../mod.ts";

const app = new Deso();

app.get("/*", middlewares.staticMiddleware({ assetPath: "./assets" }));

await app.serve({ port: 3000 });
