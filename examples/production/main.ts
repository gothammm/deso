import {
  cors,
  Deso,
  health,
  logger,
  requestId,
  secureHeaders,
  timeout,
} from "../../mod.ts";

const app = new Deso();

app.use(secureHeaders());
app.use(cors());
app.use(requestId());
app.use(logger({ format: "json", excludePaths: ["/health"] }));
app.use(timeout({ duration: 30_000 }));

app.use(health({
  checks: [
    {
      name: "memory",
      check: () => Deno.memoryUsage().heapUsed < 500 * 1024 * 1024,
    },
  ],
}));

app.get("/", (ctx) => ctx.text("Hello from production Deso!"));

app.get("/api/users", (_ctx) => {
  return Response.json({
    users: [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }],
  });
});

app.post("/api/data", async (ctx) => {
  const body = await ctx.body("json");
  return Response.json({ received: body });
});

app.get(
  "*",
  (_ctx) => Response.json({ error: "Not found", status: 404 }, { status: 404 }),
);

app.serve({ port: 3000 });
