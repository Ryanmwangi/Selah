/**
 * Key management. All key material lives in expo-secure-store;
 * iOS Keychain / Android Keystore-encrypted storage, never in SQLite,
 * never in plain files, never off-device.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { hex, type KeyPair } from './cipher';

const ENC_KEY = 'selah.key.enc.v1';
const MAC_KEY = 'selah.key.mac.v1';

const storeOpts: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export function randomBytes(n: number): Uint8Array {
  return Crypto.getRandomBytes(n);
}

/** Get (or create on first use) the device's journal key pair. */
export async function getOrCreateKeys(): Promise<KeyPair> {
  let encHex = await SecureStore.getItemAsync(ENC_KEY, storeOpts);
  let macHex = await SecureStore.getItemAsync(MAC_KEY, storeOpts);
  if (!encHex || !macHex) {
    encHex = hex.encode(randomBytes(32));
    macHex = hex.encode(randomBytes(32));
    await SecureStore.setItemAsync(ENC_KEY, encHex, storeOpts);
    await SecureStore.setItemAsync(MAC_KEY, macHex, storeOpts);
  }
  return { encKey: hex.decode(encHex), macKey: hex.decode(macHex) };
}
