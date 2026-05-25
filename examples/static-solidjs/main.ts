import * as path from "@std/path";
import { Deso, staticMiddleware } from "../../mod.ts";

const app = new Deso();

// Run vite command to build ui

const runBuild = new Deno.Command("pnpm", {
  args: ["build"],
  cwd: path.resolve("ui"),
  stdout: "inherit",
});

await runBuild.output();

app.get("/*", staticMiddleware({ assetPath: "./ui/dist" }));

await app.serve({ port: 3000 });
