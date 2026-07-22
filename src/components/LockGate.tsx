/**
 * Wraps the app. Three security behaviors:
 *  1. Privacy cover, the moment Selah leaves the foreground, an opaque
 *     cover hides journal content from the OS app switcher.
 *  2. Auto-lock, if backgrounded beyond a short grace period (or on cold
 *     start), the journal locks.
 *  3. Unlock, biometrics first (Face/Touch ID), PIN fallback with
 *     escalating backoff after failed attempts.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { useLockStore } from '../state/lockStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import { backoffSeconds } from '../lib/crypto/pin';
import { SelahMark, Ui } from './Typ';

export function LockGate({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  const lock = useLockStore();
  const [covered, setCovered] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        useLockStore.getState().onForeground(backgroundedAt.current);
        backgroundedAt.current = null;
        setCovered(false);
      } else {
        if (backgroundedAt.current == null) backgroundedAt.current = Date.now();
        setCovered(true);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {lock.enabled && lock.locked ? <LockScreen /> : null}
      {covered ? (
        <View
          style={{
            position: 'absolute', inset: 0, backgroundColor: t.bg,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <SelahMark size={40} />
        </View>
      ) : null}
    </View>
  );
}

const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as const;
const PIN_LENGTH_HINT = 4;

function LockScreen() {
  const t = useTheme();
  const lock = useLockStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const triedBiometric = useRef(false);

  const lockedOut = now < lock.lockoutUntil;

  // tick while locked out so the countdown updates
  useEffect(() => {
    if (!lockedOut) return;
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, [lockedOut]);

  const attemptBiometric = useCallback(async () => {
    const ok = await useLockStore.getState().tryBiometric();
    if (!ok) setError(null); // fall through to PIN quietly
  }, []);

  useEffect(() => {
    if (!triedBiometric.current && lock.biometricsAvailable) {
      triedBiometric.current = true;
      void attemptBiometric();
    }
  }, [lock.biometricsAvailable, attemptBiometric]);

  const press = (key: string) => {
    if (lockedOut || key === '') return;
    setError(null);
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    const next = pin + key;
    setPin(next);
    if (next.length >= PIN_LENGTH_HINT) {
      const res = useLockStore.getState().tryPin(next);
      if (res === true) {
        setPin('');
      } else {
        setPin('');
        setNow(Date.now());
        const wait = backoffSeconds(useLockStore.getState().failedAttempts);
        setError(wait > 0 ? null : 'Try again');
      }
    }
  };

  const remaining = Math.max(0, Math.ceil((lock.lockoutUntil - now) / 1000));

  return (
    <View
      style={{
        position: 'absolute', inset: 0, backgroundColor: t.bg,
        alignItems: 'center', justifyContent: 'center', gap: 28, paddingHorizontal: 40,
      }}
      accessibilityViewIsModal
    >
      <View style={{ alignItems: 'center', gap: 10 }}>
        <SelahMark size={36} />
        <Ui style={{ color: t.inkSoft }}>Your journal is locked</Ui>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        {Array.from({ length: PIN_LENGTH_HINT }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 12, height: 12, borderRadius: 6,
              borderWidth: 1, borderColor: t.inkFaint,
              backgroundColor: i < pin.length ? t.accent : 'transparent',
            }}
          />
        ))}
      </View>

      {lockedOut ? (
        <Ui style={{ color: t.danger }}>Too many attempts. Wait {remaining}s</Ui>
      ) : error ? (
        <Ui style={{ color: t.danger }}>{error}</Ui>
      ) : (
        <Ui style={{ color: 'transparent' }}> </Ui>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 264, justifyContent: 'center' }}>
        {PAD.map((key, i) => (
          <Pressable
            key={i}
            onPress={() => press(key)}
            disabled={key === '' || lockedOut}
            accessibilityRole="button"
            accessibilityLabel={key === '⌫' ? 'Delete' : key}
            style={({ pressed }) => ({
              width: 72, height: 64, margin: 8, borderRadius: 36,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: pressed ? t.surfaceAlt : 'transparent',
              opacity: lockedOut && key !== '' ? 0.35 : 1,
            })}
          >
            <Text style={{ fontFamily: fonts.displayMedium, fontSize: 24, color: t.ink }}>{key}</Text>
          </Pressable>
        ))}
      </View>

      {lock.biometricsAvailable ? (
        <Pressable onPress={attemptBiometric} accessibilityRole="button" hitSlop={8}>
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, color: t.accent }}>
            Use Face ID / fingerprint
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
