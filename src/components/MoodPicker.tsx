import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { MOODS } from '../repo/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, MOOD_META } from '../theme/tokens';

/** Multi-select, a day can be grateful *and* heavy. */
export function MoodPicker({ values, onToggle }: { values: string[]; onToggle: (m: string) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {MOODS.map((m) => {
        const meta = MOOD_META[m];
        const active = values.includes(m);
        return (
          <Pressable
            key={m}
            onPress={() => onToggle(m)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              paddingHorizontal: 13,
              paddingVertical: 8,
              borderRadius: 18,
              backgroundColor: active ? t.surfaceAlt : 'transparent',
              borderWidth: 1,
              borderColor: active ? meta.dot : t.hairline,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: meta.dot }} />
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, color: active ? t.ink : t.inkSoft }}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
