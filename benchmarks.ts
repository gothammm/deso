import { Deso } from "./mod.ts";

interface BenchResult {
  name: string;
  iterations: number;
  totalMs: number;
  opsPerSec: number;
}

const ITERATIONS = 100_000;

function bench(
  name: string,
  fn: () => Response | Promise<Response>,
  iterations: number = ITERATIONS,
): Promise<BenchResult> {
  return (async () => {
    // Warmup
    for (let i = 0; i < 1000; i++) await fn();

    const start = performance.now();
    for (let i = 0; i < iterations; i++) await fn();
    const totalMs = performance.now() - start;
    const opsPerSec = (iterations / totalMs) * 1000;

    return {
      name,
      iterations,
      totalMs: Math.round(totalMs),
      opsPerSec: Math.round(opsPerSec),
    };
  })();
}

async function main() {
  // Raw Deno.serve handler
  const rawHandler = () => new Response("ok");

  // Deso with static route
  const app = new Deso();
  app.get("/hello", () => new Response("ok"));
  app.get("/hello/:name", (ctx) => ctx.text(ctx.param("name") ?? ""));
  app.post("/data", () => new Response("created", { status: 201 }));

  const appWithMw = new Deso();
  appWithMw.use((_ctx, next) => {
    return next();
  });
  appWithMw.get("/hello", () => new Response("ok"));

  // Build requests
  const reqSimple = new Request("http://localhost/hello");
  const reqParam = new Request("http://localhost/hello/world");
  const reqPost = new Request("http://localhost/data", { method: "POST" });

  const results: BenchResult[] = [];

  results.push(await bench("raw Deno.serve handler", () => rawHandler()));

  results.push(await bench("Deso static route", () => app.fetch(reqSimple)));

  results.push(await bench("Deso param route", () => app.fetch(reqParam)));

  results.push(await bench("Deso POST route", () => app.fetch(reqPost)));

  results.push(
    await bench("Deso global middleware", () => appWithMw.fetch(reqSimple)),
  );

  // Print results
  console.log(
    `\nBenchmark (${ITERATIONS.toLocaleString()} iterations each):\n`,
  );
  console.log(
    `${"Name".padEnd(30)} ${"Total (ms)".padEnd(12)} ${"Ops/sec".padEnd(15)}`,
  );
  console.log("-".repeat(57));
  for (const r of results) {
    const opsStr = r.opsPerSec.toLocaleString();
    console.log(
      `${r.name.padEnd(30)} ${String(r.totalMs).padEnd(12)} ${
        opsStr.padStart(14)
      }`,
    );
  }

  // Calculate relative performance
  const baseline = results[0].opsPerSec;
  console.log(`\nRelative to raw handler:`);
  for (const r of results) {
    const ratio = ((r.opsPerSec / baseline) * 100).toFixed(1);
    console.log(`  ${r.name.padEnd(30)} ${ratio.padStart(5)}%`);
  }
}

if (import.meta.main) await main();
