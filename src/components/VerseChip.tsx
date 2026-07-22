import React from 'react';
import { Pressable, Text } from 'react-native';
import { formatRefShort, type VerseRef } from '../lib/scripture/refs';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';

export function VerseChip({
  refv,
  onPress,
  onRemove,
}: {
  refv: VerseRef;
  onPress?: () => void;
  onRemove?: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Scripture ${formatRefShort(refv)}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: t.accentSoft,
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12, color: t.accent }}>
        {formatRefShort(refv)}
      </Text>
      {onRemove ? (
        <Text
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel="Remove verse"
          style={{ fontFamily: fonts.uiSemi, fontSize: 12, color: t.accent, paddingLeft: 8 }}
        >
          ✕
        </Text>
      ) : null}
    </Pressable>
  );
}
