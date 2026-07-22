/**
 * App-lock state machine.
 *
 * Config (whether lock is on, the PIN verifier) lives in SecureStore;
 * hardware-backed, never in SQLite. Runtime state (locked/unlocked,
 * failed attempts with escalating backoff) lives here.
 *
 * Locking policy: lock on cold start and whenever the app spends more than
 * GRACE_MS in the background. A short grace keeps app-switching humane.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { backoffSeconds, createPinRecord, verifyPin, type PinRecord } from '../lib/crypto/pin';
import { randomBytes } from '../lib/crypto/keys';

const LOCK_ENABLED = 'selah.lock.enabled.v1';
const PIN_RECORD = 'selah.lock.pin.v1';
export const GRACE_MS = 20_000;

const storeOpts: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

interface LockState {
  ready: boolean;
  enabled: boolean;
  pinSet: boolean;
  biometricsAvailable: boolean;
  locked: boolean;
  failedAttempts: number;
  lockoutUntil: number; // epoch ms; 0 = none
  init(): Promise<void>;
  enable(pin: string): Promise<void>;
  disable(): Promise<void>;
  lock(): void;
  tryBiometric(): Promise<boolean>;
  tryPin(pin: string): boolean | 'locked-out';
  /** Called with the timestamp the app went to background, when it returns. */
  onForeground(backgroundedAt: number | null): void;
}

let pinRecord: PinRecord | null = null;

export const useLockStore = create<LockState>((set, get) => ({
  ready: false,
  enabled: false,
  pinSet: false,
  biometricsAvailable: false,
  locked: false,
  failedAttempts: 0,
  lockoutUntil: 0,

  async init() {
    const [enabledRaw, pinRaw, hasHardware, enrolled] = await Promise.all([
      SecureStore.getItemAsync(LOCK_ENABLED, storeOpts),
      SecureStore.getItemAsync(PIN_RECORD, storeOpts),
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    pinRecord = pinRaw ? (JSON.parse(pinRaw) as PinRecord) : null;
    const enabled = enabledRaw === '1' && pinRecord != null;
    set({
      ready: true,
      enabled,
      pinSet: pinRecord != null,
      biometricsAvailable: hasHardware && enrolled,
      locked: enabled, // locked at cold start when enabled
    });
  },

  async enable(pin) {
    pinRecord = createPinRecord(pin, randomBytes(16));
    await SecureStore.setItemAsync(PIN_RECORD, JSON.stringify(pinRecord), storeOpts);
    await SecureStore.setItemAsync(LOCK_ENABLED, '1', storeOpts);
    set({ enabled: true, pinSet: true, locked: false });
  },

  async disable() {
    await SecureStore.deleteItemAsync(LOCK_ENABLED, storeOpts);
    await SecureStore.deleteItemAsync(PIN_RECORD, storeOpts);
    pinRecord = null;
    set({ enabled: false, pinSet: false, locked: false, failedAttempts: 0, lockoutUntil: 0 });
  },

  lock() {
    if (get().enabled) set({ locked: true });
  },

  async tryBiometric() {
    if (!get().biometricsAvailable) return false;
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Selah',
      cancelLabel: 'Use PIN',
      disableDeviceFallback: true, // device PIN ≠ journal PIN; keep ours
    });
    if (res.success) {
      set({ locked: false, failedAttempts: 0, lockoutUntil: 0 });
      return true;
    }
    return false;
  },

  tryPin(pin) {
    const s = get();
    if (Date.now() < s.lockoutUntil) return 'locked-out';
    if (pinRecord && verifyPin(pin, pinRecord)) {
      set({ locked: false, failedAttempts: 0, lockoutUntil: 0 });
      return true;
    }
    const failedAttempts = s.failedAttempts + 1;
    const wait = backoffSeconds(failedAttempts);
    set({ failedAttempts, lockoutUntil: wait > 0 ? Date.now() + wait * 1000 : 0 });
    return false;
  },

  onForeground(backgroundedAt) {
    if (!get().enabled || get().locked) return;
    if (backgroundedAt != null && Date.now() - backgroundedAt > GRACE_MS) {
      set({ locked: true });
    }
  },
}));
