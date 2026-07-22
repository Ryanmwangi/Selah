import { sha256 } from './sha256';

const BLOCK = 64;

/** HMAC-SHA256 (RFC 2104). */
export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  let k = key;
  if (k.length > BLOCK) k = sha256(k);
  const ipad = new Uint8Array(BLOCK + message.length);
  const opad = new Uint8Array(BLOCK + 32);
  for (let i = 0; i < BLOCK; i++) {
    const kb = i < k.length ? k[i] : 0;
    ipad[i] = kb ^ 0x36;
    opad[i] = kb ^ 0x5c;
  }
  ipad.set(message, BLOCK);
  opad.set(sha256(ipad), BLOCK);
  return sha256(opad);
}

/** Constant-time comparison, never short-circuit on MAC bytes. */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** PBKDF2-HMAC-SHA256 (RFC 2898). */
export function pbkdf2Sha256(
  password: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  keyLen: number,
): Uint8Array {
  if (iterations < 1) throw new Error('pbkdf2: iterations must be >= 1');
  const blocks = Math.ceil(keyLen / 32);
  const out = new Uint8Array(blocks * 32);
  for (let blk = 1; blk <= blocks; blk++) {
    const saltBlock = new Uint8Array(salt.length + 4);
    saltBlock.set(salt);
    new DataView(saltBlock.buffer).setUint32(salt.length, blk);
    let u = hmacSha256(password, saltBlock);
    const t = new Uint8Array(u);
    for (let i = 1; i < iterations; i++) {
      u = hmacSha256(password, u);
      for (let j = 0; j < 32; j++) t[j] ^= u[j];
    }
    out.set(t, (blk - 1) * 32);
  }
  return out.slice(0, keyLen);
}
