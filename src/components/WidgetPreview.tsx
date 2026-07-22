import React from 'react';
import { Text, View } from 'react-native';
import type { WidgetPayload } from '../lib/widget/payload';
import { useTheme } from '../theme/ThemeContext';
import { fonts, SELAH_MARK } from '../theme/tokens';

/**
 * A faithful in-app mock of the real widgets so the user can see what they're
 * leaving themselves before it lands on the home/lock screen. Matches the
 * native layouts in targets/widget (iOS) and src/widgets (Android).
 */
export function WidgetPreview({ payload }: { payload: WidgetPayload }) {
  const t = useTheme();
  return (
    <View style={{ gap: 16 }}>
      {/* Home-screen (medium) */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fonts.uiSemi, fontSize: 11, letterSpacing: 1.2, color: t.inkFaint, textTransform: 'uppercase' }}>
          Home screen
        </Text>
        <View
          style={{
            backgroundColor: t.surface,
            borderRadius: 22,
            padding: 18,
            gap: 8,
            justifyContent: 'space-between',
            minHeight: 138,
            shadowColor: t.name === 'dawn' ? '#5A5178' : '#000',
            shadowOpacity: 0.14,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 5 },
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.uiSemi, fontSize: 11, letterSpacing: 1, color: t.accent, textTransform: 'uppercase' }}>
              {payload.eyebrow}
            </Text>
            <Text style={{ fontFamily: fonts.display, fontSize: 15, color: t.accent }}>{SELAH_MARK}</Text>
          </View>
          <Text
            style={{ fontFamily: fonts.serif, fontSize: payload.kind === 'streak' ? 22 : 16, lineHeight: payload.kind === 'streak' ? 26 : 23, color: t.ink }}
            numberOfLines={4}
          >
            {payload.body}
          </Text>
          <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: t.inkFaint }} numberOfLines={1}>
            {payload.footer}
          </Text>
        </View>
      </View>

      {/* Lock-screen (iOS accessory rectangular) */}
      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: fonts.uiSemi, fontSize: 11, letterSpacing: 1.2, color: t.inkFaint, textTransform: 'uppercase' }}>
          Lock screen · iPhone
        </Text>
        <View
          style={{
            backgroundColor: t.name === 'dawn' ? '#3A3550' : '#000',
            borderRadius: 16,
            padding: 14,
          }}
        >
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.16)',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 9,
              gap: 2,
            }}
          >
            <Text style={{ fontFamily: fonts.uiSemi, fontSize: 10, letterSpacing: 0.8, color: '#FFFFFF', textTransform: 'uppercase', opacity: 0.85 }}>
              {SELAH_MARK} {payload.eyebrow}
            </Text>
            <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: '#FFFFFF', opacity: 0.95 }} numberOfLines={2}>
              {payload.accessoryShort}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
