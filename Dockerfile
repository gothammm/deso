FROM denoland/deno:2.8.0

WORKDIR /app

COPY deno.jsonc mod.ts ./
COPY lib/ ./lib/

RUN deno cache mod.ts

EXPOSE 3000

CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-env", "main.ts"]
