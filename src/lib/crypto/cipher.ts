/**
 * Authenticated encryption envelope for journal content.
 *
 * Scheme: AES-256-CTR + HMAC-SHA256, encrypt-then-MAC (an AE composition
 * that runs everywhere aes-js does, RN has no native WebCrypto AES-GCM).
 *
 * Envelope layout (bytes):  [version:1][iv:16][ciphertext:n][mac:32]
 * MAC covers version || iv || ciphertext with a MAC key *separate* from the
 * encryption key. Decryption verifies the MAC in constant time first.
 *
 * Used today for encrypted exports; it is the same envelope Phase 7 cloud
 * sync will use so nothing plaintext ever leaves the device.
 */
import aesjs from 'aes-js';
import { hmacSha256, timingSafeEqual } from './hmac';

export const ENVELOPE_VERSION = 1;
const IV_LEN = 16;
const MAC_LEN = 32;

export interface KeyPair {
  encKey: Uint8Array; // 32 bytes
  macKey: Uint8Array; // 32 bytes
}

export function assertKeys(keys: KeyPair): void {
  if (keys.encKey.length !== 32 || keys.macKey.length !== 32) {
    throw new Error('cipher: keys must be 32 bytes each');
  }
  if (timingSafeEqual(keys.encKey, keys.macKey)) {
    throw new Error('cipher: encryption and MAC keys must differ');
  }
}

export function encrypt(plaintext: Uint8Array, keys: KeyPair, iv: Uint8Array): Uint8Array {
  assertKeys(keys);
  if (iv.length !== IV_LEN) throw new Error('cipher: iv must be 16 bytes');
  const ctr = new aesjs.ModeOfOperation.ctr(keys.encKey, new aesjs.Counter(iv));
  const ciphertext = ctr.encrypt(plaintext);
  const macInput = new Uint8Array(1 + IV_LEN + ciphertext.length);
  macInput[0] = ENVELOPE_VERSION;
  macInput.set(iv, 1);
  macInput.set(ciphertext, 1 + IV_LEN);
  const mac = hmacSha256(keys.macKey, macInput);
  const out = new Uint8Array(macInput.length + MAC_LEN);
  out.set(macInput);
  out.set(mac, macInput.length);
  return out;
}

export function decrypt(envelope: Uint8Array, keys: KeyPair): Uint8Array {
  assertKeys(keys);
  if (envelope.length < 1 + IV_LEN + MAC_LEN) throw new Error('cipher: envelope too short');
  if (envelope[0] !== ENVELOPE_VERSION) throw new Error('cipher: unknown envelope version');
  const macStart = envelope.length - MAC_LEN;
  const macInput = envelope.subarray(0, macStart);
  const mac = envelope.subarray(macStart);
  if (!timingSafeEqual(hmacSha256(keys.macKey, new Uint8Array(macInput)), new Uint8Array(mac))) {
    throw new Error('cipher: authentication failed, data tampered or wrong key');
  }
  const iv = envelope.subarray(1, 1 + IV_LEN);
  const ciphertext = envelope.subarray(1 + IV_LEN, macStart);
  const ctr = new aesjs.ModeOfOperation.ctr(keys.encKey, new aesjs.Counter(new Uint8Array(iv)));
  return ctr.decrypt(new Uint8Array(ciphertext));
}

// aes-js's utf8 helpers corrupt astral-plane characters (surrogate pairs);
// use the platform codecs (native in Hermes and Node).
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
export const utf8 = {
  encode: (s: string): Uint8Array => textEncoder.encode(s),
  decode: (b: Uint8Array): string => textDecoder.decode(b),
};

export const hex = {
  encode: (b: Uint8Array): string => aesjs.utils.hex.fromBytes(b),
  decode: (s: string): Uint8Array => new Uint8Array(aesjs.utils.hex.toBytes(s)),
};
