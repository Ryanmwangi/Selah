import * as Crypto from 'expo-crypto';

/** UUIDv4 from the platform CSPRNG. */
export function newId(): string {
  return Crypto.randomUUID();
}
