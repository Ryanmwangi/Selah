import React from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fonts, SELAH_MARK } from '../theme/tokens';

type TypProps = TextProps & { style?: StyleProp<TextStyle> };

/** Display serif, screen titles, big dates. */
export function Display({ style, ...rest }: TypProps) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[{ fontFamily: fonts.display, color: t.ink, fontSize: 28, lineHeight: 34 }, style]}
    />
  );
}

/** Serif body, entry text, scripture. */
export function Serif({ style, ...rest }: TypProps) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[{ fontFamily: fonts.serif, color: t.ink, fontSize: 17, lineHeight: 27 }, style]}
    />
  );
}

/** UI sans, labels, buttons, metadata. */
export function Ui({ style, ...rest }: TypProps) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[{ fontFamily: fonts.ui, color: t.inkSoft, fontSize: 14, lineHeight: 20 }, style]}
    />
  );
}

/** Small-caps-feel overline label. */
export function Overline({ style, ...rest }: TypProps) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: fonts.uiSemi,
          color: t.inkFaint,
          fontSize: 11,
          lineHeight: 14,
          letterSpacing: 1.6,
          textTransform: 'uppercase' as const,
        },
        style,
      ]}
    />
  );
}

/** The caesura brand mark. */
export function SelahMark({ size = 22, color }: { size?: number; color?: string }) {
  const t = useTheme();
  return (
    <Text
      accessibilityElementsHidden
      style={{ fontFamily: fonts.display, fontSize: size, lineHeight: size * 1.2, color: color ?? t.accent }}
    >
      {SELAH_MARK}
    </Text>
  );
}
