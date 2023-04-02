import { Deso } from "../mod.ts";

export async function desoServer(
  app: Deso,
  assertionBlock: (baseUrl: string) => void,
) {
  const port = 0;
  const controller = new AbortController();
  const { signal } = controller;

  await app.serve({
    port,
    signal,
    onListen: async ({ hostname, port }) => {
      const baseUrl = `http://${hostname}:${port}`;
      await assertionBlock(baseUrl);
      controller.abort();
    },
  });
}
