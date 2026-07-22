import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

/**
 * The timeline's single piece of chrome: a floating pill of three;
 * Bible · write · insights, with the write action in the middle.
 * Everything else is whitespace.
 */
export function BottomBar() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const writeFg = t.name === 'dawn' ? '#FCFBFE' : '#1D1B26';

  const side = (name: keyof typeof Feather.glyphMap, label: string, to: string) => (
    <Pressable
      onPress={() => router.push(to as never)}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({ padding: 14, opacity: pressed ? 0.5 : 1 })}
    >
      <Feather name={name} size={21} color={t.inkSoft} />
    </Pressable>
  );

  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 18, alignItems: 'center' }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: t.surface,
          borderRadius: 34,
          paddingHorizontal: 10,
          paddingVertical: 6,
          shadowColor: t.name === 'dawn' ? '#5A5178' : '#000',
          shadowOpacity: 0.18,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        {side('book-open', 'Read the Bible', '/bible')}
        <Pressable
          onPress={() => router.push('/compose')}
          accessibilityRole="button"
          accessibilityLabel="New entry"
          style={({ pressed }) => ({
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: t.accent,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.94 : 1 }],
          })}
        >
          <Feather name="feather" size={22} color={writeFg} />
        </Pressable>
        {side('bar-chart-2', 'Insights', '/insights')}
      </View>
    </View>
  );
}
