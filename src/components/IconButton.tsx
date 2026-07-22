import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export function IconButton({
  name,
  onPress,
  label,
  color,
  size = 20,
}: {
  name: keyof typeof Feather.glyphMap;
  onPress: () => void;
  label: string;
  color?: string;
  size?: number;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.5 : 1 })}
    >
      <Feather name={name} size={size} color={color ?? t.inkSoft} />
    </Pressable>
  );
}
