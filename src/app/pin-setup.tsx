import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { IconButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Serif, Ui } from '../components/Typ';
import { track } from '../lib/analytics';
import { useLockStore } from '../state/lockStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';

const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'] as const;
const PIN_LEN = 4;

/** Two-step PIN creation for app lock. */
export default function PinSetup() {
  const t = useTheme();
  const [first, setFirst] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  const press = async (key: string) => {
    if (key === '') return;
    setError(null);
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    const next = pin + key;
    if (next.length < PIN_LEN) {
      setPin(next);
      return;
    }
    // full length reached
    if (first == null) {
      setFirst(next);
      setPin('');
    } else if (first === next) {
      await useLockStore.getState().enable(next);
      track('lock_enabled');
      router.back();
    } else {
      setFirst(null);
      setPin('');
      setError('PINs didn’t match. Start again');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader left={<IconButton name="x" label="Cancel" onPress={() => router.back()} size={22} />} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, paddingBottom: 40 }}>
        <Serif style={{ fontSize: 18 }}>
          {first == null ? 'Choose a 4-digit PIN' : 'Type it once more'}
        </Serif>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {Array.from({ length: PIN_LEN }).map((_, i) => (
            <View
              key={i}
              style={{
                width: 12, height: 12, borderRadius: 6, borderWidth: 1,
                borderColor: t.inkFaint,
                backgroundColor: i < pin.length ? t.accent : 'transparent',
              }}
            />
          ))}
        </View>
        {error ? <Ui style={{ color: t.danger }}>{error}</Ui> : <Ui> </Ui>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 264, justifyContent: 'center' }}>
          {PAD.map((key, i) => (
            <Pressable
              key={i}
              onPress={() => void press(key)}
              disabled={key === ''}
              accessibilityRole="button"
              accessibilityLabel={key === '⌫' ? 'Delete' : key}
              style={({ pressed }) => ({
                width: 72, height: 64, margin: 8, borderRadius: 36,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: pressed ? t.surfaceAlt : 'transparent',
              })}
            >
              <Text style={{ fontFamily: fonts.displayMedium, fontSize: 24, color: t.ink }}>{key}</Text>
            </Pressable>
          ))}
        </View>
        <Ui style={{ color: t.inkFaint, paddingHorizontal: 48, textAlign: 'center' }}>
          If you have Face ID or a fingerprint set up, Selah will offer it first; the PIN is your fallback.
        </Ui>
      </View>
    </View>
  );
}
