import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { EntryCard } from '../components/EntryCard';
import { IconButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Overline } from '../components/Typ';
import { useDb } from '../db/DbProvider';
import { encodeVerseParam } from '../lib/routeParams';
import { formatRef, parseRef } from '../lib/scripture/refs';
import { searchEntries } from '../repo/entries';
import { tagUsageCounts } from '../repo/tags';
import { MOODS } from '../repo/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, MOOD_META } from '../theme/tokens';

export default function Search() {
  const t = useTheme();
  const { journal } = useDb();
  const [text, setText] = useState('');
  const [tagId, setTagId] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);

  const { data: tags } = useQuery({ queryKey: ['tags'], queryFn: () => tagUsageCounts(journal) });

  const filters = useMemo(
    () => ({ text: text || undefined, tagId: tagId ?? undefined, mood: mood ?? undefined }),
    [text, tagId, mood],
  );
  const { data: results } = useQuery({
    queryKey: ['search', filters],
    queryFn: () => searchEntries(journal, filters),
  });

  // If the query itself is a scripture reference, offer the passage jump.
  const refMatch = useMemo(() => (text.trim() ? parseRef(text) : null), [text]);
  const hasFilter = text.trim() !== '' || tagId != null || mood != null;

  const chip = (active: boolean) =>
    ({
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: active ? t.accent : t.hairline,
      backgroundColor: active ? t.accentSoft : 'transparent',
    }) as const;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} size={24} />}
        right={
          <IconButton
            name="calendar"
            label="Jump to a date"
            onPress={() => router.push('/calendar')}
            size={22}
          />
        }
      />
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <TextInput
          placeholder="Search your journal…"
          placeholderTextColor={t.inkFaint}
          value={text}
          onChangeText={setText}
          autoFocus
          style={{
            fontFamily: fonts.serif,
            fontSize: 18,
            color: t.ink,
            borderBottomWidth: 1,
            borderBottomColor: t.hairline,
            paddingVertical: 8,
          }}
          accessibilityLabel="Search"
        />

        {refMatch ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/passage', params: { v: encodeVerseParam(refMatch) } })}
            style={{
              backgroundColor: t.verseBg,
              borderRadius: 8,
              padding: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, color: t.accent }}>
              Reflections on {formatRef(refMatch)} →
            </Text>
          </Pressable>
        ) : null}

        {/* filters */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(tags ?? []).filter((x) => x.uses > 0).slice(0, 8).map((tag) => (
            <Pressable
              key={tag.id}
              onPress={() => setTagId(tagId === tag.id ? null : tag.id)}
              accessibilityRole="button"
              style={chip(tagId === tag.id)}
            >
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, color: tagId === tag.id ? t.accent : t.inkSoft }}>
                #{tag.name}
              </Text>
            </Pressable>
          ))}
          {MOODS.map((m) => (
            <Pressable
              key={m}
              onPress={() => setMood(mood === m ? null : m)}
              accessibilityRole="button"
              style={chip(mood === m)}
            >
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, color: mood === m ? t.accent : t.inkFaint }}>
                {MOOD_META[m].label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={hasFilter ? results ?? [] : []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 60 }}
        ListHeaderComponent={
          hasFilter && results && results.length > 0 ? (
            <Overline style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
              {results.length} {results.length === 1 ? 'entry' : 'entries'}
            </Overline>
          ) : null
        }
        renderItem={({ item }) => (
          <EntryCard entry={item} onPress={() => router.push(`/entry/${item.id}`)} />
        )}
        ListEmptyComponent={
          hasFilter ? (
            <EmptyState title="Nothing found." hint="Try fewer words. Search matches word beginnings." />
          ) : (
            <EmptyState
              title="Search across every season."
              hint="Words, #tags, moods, or a reference like “Psalm 23”. Tap the calendar to jump to a date."
            />
          )
        }
      />
    </View>
  );
}
