import * as path from "https://deno.land/std@0.181.0/path/mod.ts";
import { Deso } from "../../mod.ts";
import { middlewares } from "../../mod.ts";
const app = new Deso();

// Run vite command to build ui

const runBuild = new Deno.Command("pnpm", {
  args: ["build"],
  cwd: path.resolve("ui"),
  stdout: "inherit",
});

await runBuild.output();

app.get("/*", middlewares.staticMiddleware({ assetPath: "./ui/dist" }));

await app.serve({ port: 3000 });
