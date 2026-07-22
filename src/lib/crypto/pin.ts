/**
 * PIN verifier for the app-lock fallback.
 *
 * The PIN itself is never stored. We store PBKDF2-HMAC-SHA256(pin, salt)
 * (hex) in hardware-backed SecureStore. 30k iterations keeps unlock <1s in
 * Hermes while making offline guessing of a short PIN meaningfully slower;
 * the verifier only exists inside the OS keystore-protected store, and
 * attempt throttling (see lock store) is the primary brute-force control.
 */
import { pbkdf2Sha256 } from './hmac';
import { hex, utf8 } from './cipher';
import { timingSafeEqual } from './hmac';

export const PIN_ITERATIONS = 30_000;
export const PIN_MIN_LENGTH = 4;

export interface PinRecord {
  saltHex: string;
  verifierHex: string;
  iterations: number;
}

export function createPinRecord(pin: string, salt: Uint8Array, iterations = PIN_ITERATIONS): PinRecord {
  if (pin.length < PIN_MIN_LENGTH) throw new Error(`PIN must be at least ${PIN_MIN_LENGTH} digits`);
  const verifier = pbkdf2Sha256(utf8.encode(pin), salt, iterations, 32);
  return { saltHex: hex.encode(salt), verifierHex: hex.encode(verifier), iterations };
}

export function verifyPin(pin: string, record: PinRecord): boolean {
  const candidate = pbkdf2Sha256(utf8.encode(pin), hex.decode(record.saltHex), record.iterations, 32);
  return timingSafeEqual(candidate, hex.decode(record.verifierHex));
}

/** Escalating delay after failed attempts: 0,0,0,5s,30s,60s,300s… */
export function backoffSeconds(failedAttempts: number): number {
  if (failedAttempts < 3) return 0;
  if (failedAttempts === 3) return 5;
  if (failedAttempts === 4) return 30;
  if (failedAttempts === 5) return 60;
  return 300;
}
