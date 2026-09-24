import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { snippet } from '../lib/markdown';
import { formatRefShort } from '../lib/scripture/refs';
import { linkToRef } from '../repo/verseLinks';
import type { EntryWithMeta } from '../repo/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, MOOD_META } from '../theme/tokens';

/**
 * Timeline row: a quiet serif day numeral in the margin, then text.
 * No boxes, no borders, whitespace does the separating.
 */
export function EntryCard({ entry, onPress }: { entry: EntryWithMeta; onPress: () => void }) {
  const t = useTheme();
  const d = new Date(entry.created_at);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 18,
        paddingVertical: 18,
        paddingHorizontal: 24,
        backgroundColor: pressed ? t.surfaceAlt : 'transparent',
        borderRadius: 16,
      })}
    >
      <View style={{ width: 40, alignItems: 'center' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: t.ink }}>
          {format(d, 'd')}
        </Text>
        <Text style={{ fontFamily: fonts.uiSemi, fontSize: 9.5, letterSpacing: 1.4, color: t.inkFaint, marginTop: 2 }}>
          {format(d, 'EEE').toUpperCase()}
        </Text>
        {entry.is_pinned ? (
          <Text style={{ fontSize: 9, color: t.gold, marginTop: 4 }} accessibilityLabel="Pinned">
            ◆
          </Text>
        ) : null}
      </View>

      <View style={{ flex: 1, gap: 6 }}>
        {entry.title ? (
          <Text style={{ fontFamily: fonts.displayMedium, fontSize: 16.5, color: t.ink }} numberOfLines={1}>
            {entry.title}
          </Text>
        ) : null}
        {entry.body.trim() ? (
          <Text
            style={{ fontFamily: fonts.serif, fontSize: 14.5, lineHeight: 23, color: t.inkSoft }}
            numberOfLines={entry.title ? 2 : 3}
          >
            {snippet(entry.body)}
          </Text>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 2 }}>
          {entry.verseLinks.slice(0, 2).map((l) => (
            <Text key={l.id} style={{ fontFamily: fonts.uiMedium, fontSize: 11.5, color: t.accent }}>
              {formatRefShort(linkToRef(l))}
            </Text>
          ))}
          {entry.moods.slice(0, 3).map((m) =>
            MOOD_META[m] ? (
              <View
                key={m}
                accessibilityLabel={MOOD_META[m].label}
                style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: MOOD_META[m].dot }}
              />
            ) : null,
          )}
          {entry.attachments.some((a) => a.type !== 'audio') ? (
            <Feather name="image" size={11.5} color={t.inkFaint} />
          ) : null}
          {entry.attachments.some((a) => a.type === 'audio') ? (
            <Feather name="mic" size={11.5} color={t.inkFaint} />
          ) : null}
          {entry.place_name ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Feather name="map-pin" size={10.5} color={t.inkFaint} />
              <Text numberOfLines={1} style={{ fontFamily: fonts.ui, fontSize: 11, color: t.inkFaint, maxWidth: 120 }}>
                {entry.place_name}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
