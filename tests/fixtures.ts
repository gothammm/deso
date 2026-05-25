import type { Deso } from "../mod.ts";

export async function desoServer(
  app: Deso,
  assertionBlock: (baseUrl: string) => Promise<void>,
) {
  const ac = new AbortController();
  const { signal } = ac;

  await app.serve({
    port: 0,
    signal,
    onListen: async (addr: Deno.NetAddr) => {
      const baseUrl = `http://${addr.hostname}:${addr.port}`;
      await assertionBlock(baseUrl);
      ac.abort();
    },
  });
}
