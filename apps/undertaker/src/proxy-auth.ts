import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Verifies the Kiro Crew gateway's proxy signatures. HMAC key is the app secret.
//   v2 (replay-proof, newer gateways):
//     X-KiroCrew-Proxy-V2: <ts>:<hex hmac-sha256>, X-KiroCrew-Proxy-Nonce: <32 lowercase hex>
//     message v2:<ts>:<nonce>:<method>:<raw-target>:<sha256(body)>
//   v1 (sent by Kiro Crew 0.11.0, checked against a real gateway):
//     X-KiroCrew-Proxy: <ts>:<hex hmac-sha256>
//     message <ts>:<method>:<raw-target>:<sha256(body)>

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

export function signV1(secret: string, ts: number, method: string, target: string, body: Uint8Array): string {
  const bodyHash = createHash("sha256").update(body).digest("hex");
  return createHmac("sha256", secret).update(`${ts}:${method}:${target}:${bodyHash}`).digest("hex");
}

export function verifyProxyV1(signature: string | undefined, req: Omit<SignedRequest, "signature" | "nonce">, secret: string, nowSeconds: number): boolean {
  const [tsText, mac] = (signature ?? "").split(":");
  const ts = Number(tsText);
  if (!mac || !Number.isInteger(ts) || Math.abs(nowSeconds - ts) > WINDOW_SECONDS) return false;
  const expected = Buffer.from(signV1(secret, ts, req.method, req.target, req.body), "hex");
  const given = Buffer.from(mac, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
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
