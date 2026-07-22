import assert from 'node:assert/strict';
import nodeCrypto from 'node:crypto';
import { test } from 'node:test';
import { decrypt, encrypt, utf8, hex } from '../src/lib/crypto/cipher';
import { hmacSha256, pbkdf2Sha256, timingSafeEqual } from '../src/lib/crypto/hmac';
import { backoffSeconds, createPinRecord, verifyPin } from '../src/lib/crypto/pin';
import { sha256 } from '../src/lib/crypto/sha256';

const rnd = (n: number) => new Uint8Array(nodeCrypto.randomBytes(n));

test('sha256 matches node:crypto across sizes', () => {
  for (const size of [0, 1, 3, 55, 56, 63, 64, 65, 100, 1000, 10000]) {
    const data = rnd(size);
    const expected = nodeCrypto.createHash('sha256').update(data).digest('hex');
    assert.equal(hex.encode(sha256(data)), expected, `size ${size}`);
  }
  // FIPS vector
  assert.equal(
    hex.encode(sha256(utf8.encode('abc'))),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
  );
});

test('hmacSha256 matches node:crypto incl. long keys', () => {
  for (const [keyLen, msgLen] of [[16, 10], [64, 100], [65, 0], [200, 5000]]) {
    const key = rnd(keyLen);
    const msg = rnd(msgLen);
    const expected = nodeCrypto.createHmac('sha256', key).update(msg).digest('hex');
    assert.equal(hex.encode(hmacSha256(key, msg)), expected, `key ${keyLen} msg ${msgLen}`);
  }
});

test('pbkdf2Sha256 matches node:crypto', () => {
  const pw = utf8.encode('correct horse');
  const salt = utf8.encode('salty');
  for (const [iters, len] of [[1, 32], [1000, 32], [1000, 48], [4096, 20]]) {
    const expected = nodeCrypto.pbkdf2Sync(pw, salt, iters, len, 'sha256').toString('hex');
    assert.equal(hex.encode(pbkdf2Sha256(pw, salt, iters, len)), expected, `iters ${iters} len ${len}`);
  }
});

test('encrypt/decrypt round-trips', () => {
  const keys = { encKey: rnd(32), macKey: rnd(32) };
  for (const msg of ['', 'selah', 'א ברית — עוֹלָם 🙏', 'x'.repeat(50_000)]) {
    const env = encrypt(utf8.encode(msg), keys, rnd(16));
    assert.equal(utf8.decode(decrypt(env, keys)), msg);
  }
});

test('decrypt rejects tampering anywhere in the envelope', () => {
  const keys = { encKey: rnd(32), macKey: rnd(32) };
  const env = encrypt(utf8.encode('private words'), keys, rnd(16));
  for (const idx of [0, 1, 17, env.length - 33, env.length - 1]) {
    const bad = new Uint8Array(env);
    bad[idx] ^= 0x01;
    assert.throws(() => decrypt(bad, keys), /authentication failed|unknown envelope/, `byte ${idx}`);
  }
});

test('decrypt rejects the wrong key and same-key misuse', () => {
  const keys = { encKey: rnd(32), macKey: rnd(32) };
  const env = encrypt(utf8.encode('hello'), keys, rnd(16));
  assert.throws(() => decrypt(env, { encKey: rnd(32), macKey: rnd(32) }), /authentication failed/);
  const k = rnd(32);
  assert.throws(() => encrypt(utf8.encode('x'), { encKey: k, macKey: k }, rnd(16)), /must differ/);
});

test('timingSafeEqual basics', () => {
  assert.ok(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2])));
  assert.ok(!timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3])));
  assert.ok(!timingSafeEqual(new Uint8Array([1]), new Uint8Array([1, 2])));
});

test('PIN record verifies correct PIN and rejects wrong one', () => {
  const rec = createPinRecord('4712', rnd(16), 100); // low iters for test speed
  assert.ok(verifyPin('4712', rec));
  assert.ok(!verifyPin('4713', rec));
  assert.ok(!verifyPin('', rec));
  assert.throws(() => createPinRecord('12', rnd(16), 100), /at least/);
});

test('backoff escalates', () => {
  assert.equal(backoffSeconds(0), 0);
  assert.equal(backoffSeconds(2), 0);
  assert.equal(backoffSeconds(3), 5);
  assert.equal(backoffSeconds(4), 30);
  assert.equal(backoffSeconds(5), 60);
  assert.equal(backoffSeconds(9), 300);
});
