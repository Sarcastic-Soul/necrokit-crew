// Backend entry point. Bundled to backend/server.mjs, which the Kiro Crew gateway
// starts with node and reaches through /apps/undertaker/api/*.
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApi } from "./api.ts";
import { defaultWatches, resolveDataDir, storePath } from "./config.ts";
import { createNonceCache } from "./proxy-auth.ts";
import { createScanner } from "./scanner.ts";
import { openStore } from "./store.ts";

const MAX_BODY_BYTES = 64 * 1024;
const DEV_PORT = 8787;

// backend/server.mjs -> app root is one level up.
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = resolveDataDir(process.env, appRoot);
const store = openStore(storePath(dataDir));
const now = () => new Date().toISOString();
const secret = process.env.KIROCREW_PROXY_SECRET ?? "";

const handle = createApi({
  store,
  scan: createScanner(),
  now,
  ...(secret ? { secret, nonces: createNonceCache() } : {}),
});

const server = createServer((req, res) => {
  const chunks: Buffer[] = [];
  let size = 0;
  req.on("data", (chunk: Buffer) => {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      res.writeHead(413, { "content-type": "application/json" }).end('{"error":"Body too large"}');
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", () => {
    if (res.writableEnded) return;
    handle({ method: req.method ?? "GET", target: req.url ?? "/", headers: req.headers, body: Buffer.concat(chunks) })
      .then((out) => res.writeHead(out.status, out.headers).end(out.body))
      .catch((error: unknown) => {
        res.writeHead(500, { "content-type": "application/json" }).end(JSON.stringify({ error: String(error) }));
      });
  });
});

const port = Number(process.env.PORT ?? DEV_PORT);
await store.seedWatches(defaultWatches(now()));
server.listen(port, "127.0.0.1", () => {
  const mode = secret ? "gateway (signed requests only)" : "local dev (no signature check)";
  console.log(`Undertaker backend on http://127.0.0.1:${port}  mode: ${mode}  data: ${dataDir}`);
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
