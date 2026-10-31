import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Verifies the Kiro Crew gateway's replay-proof proxy signature:
//   X-KiroCrew-Proxy-V2: <ts>:<hex hmac-sha256>
//   X-KiroCrew-Proxy-Nonce: <32 lowercase hex>
// HMAC key is the app secret; message is v2:<ts>:<nonce>:<method>:<raw-target>:<sha256(body)>.
// See docs/app-kit/api-reference.md, "Replay-proof v2 signature".

const WINDOW_SECONDS = 60;
const NONCE = /^[0-9a-f]{32}$/;

export type NonceCache = { seen: Map<string, number>; max: number };

export function createNonceCache(max = 4096): NonceCache {
  return { seen: new Map(), max };
}

export type SignedRequest = {
  method: string;
  target: string;
  body: Uint8Array;
  signature: string | undefined;
  nonce: string | undefined;
};

export function signV2(secret: string, ts: number, nonce: string, method: string, target: string, body: Uint8Array): string {
  const bodyHash = createHash("sha256").update(body).digest("hex");
  return createHmac("sha256", secret).update(`v2:${ts}:${nonce}:${method}:${target}:${bodyHash}`).digest("hex");
}

export function verifyProxyV2(req: SignedRequest, secret: string, nowSeconds: number, cache: NonceCache): boolean {
  const [tsText, mac] = (req.signature ?? "").split(":");
  const ts = Number(tsText);
  if (!mac || !Number.isInteger(ts) || !req.nonce || !NONCE.test(req.nonce)) return false;
  if (Math.abs(nowSeconds - ts) > WINDOW_SECONDS) return false;

  const expected = Buffer.from(signV2(secret, ts, req.nonce, req.method, req.target, req.body), "hex");
  const given = Buffer.from(mac, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;

  for (const [nonce, expires] of cache.seen) if (expires < nowSeconds) cache.seen.delete(nonce);
  // Refuse rather than evict a live nonce when full, as the gateway's own cache does.
  if (cache.seen.has(req.nonce) || cache.seen.size >= cache.max) return false;
  cache.seen.set(req.nonce, ts + WINDOW_SECONDS);
  return true;
}
