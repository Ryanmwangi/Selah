import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { BottomBar } from '../components/BottomBar';
import { EmptyState } from '../components/EmptyState';
import { EntryCard } from '../components/EntryCard';
import { IconButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Overline, SelahMark } from '../components/Typ';
import { useDb } from '../db/DbProvider';
import { encodeVerseParam } from '../lib/routeParams';
import { formatRefShort } from '../lib/scripture/refs';
import { entriesInWindows, searchEntries } from '../repo/entries';
import { getPassage, pickDailyVerse } from '../repo/scripture';
import type { EntryWithMeta } from '../repo/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';

type Row = { kind: 'month'; label: string } | { kind: 'entry'; entry: EntryWithMeta };

function useOnThisDay() {
  const { journal } = useDb();
  return useQuery({
    queryKey: ['onThisDay', format(new Date(), 'yyyy-MM-dd')],
    queryFn: () => {
      const now = new Date();
      const windows: Array<[number, number]> = [];
      for (let y = 1; y <= 10; y++) {
        const start = new Date(now.getFullYear() - y, now.getMonth(), now.getDate());
        const end = new Date(now.getFullYear() - y, now.getMonth(), now.getDate() + 1);
        windows.push([start.getTime(), end.getTime()]);
      }
      return entriesInWindows(journal, windows);
    },
  });
}

export default function Timeline() {
  const t = useTheme();
  const { journal, scripture } = useDb();
  const dayKeyStr = format(new Date(), 'yyyy-MM-dd');

  const { data: entries } = useQuery({
    queryKey: ['timeline'],
    queryFn: () => searchEntries(journal, {}),
  });
  const { data: memories } = useOnThisDay();

  const dailyVerse = useMemo(() => pickDailyVerse(dayKeyStr), [dayKeyStr]);
  const { data: dailyVerseText } = useQuery({
    queryKey: ['dailyVerseText', dayKeyStr],
    queryFn: () => getPassage(scripture, dailyVerse),
  });

  const rows = useMemo<Row[]>(() => {
    if (!entries) return [];
    const out: Row[] = [];
    let month = '';
    for (const e of entries) {
      const label = format(new Date(e.created_at), 'MMMM');
      if (label !== month && !e.is_pinned) {
        month = label;
        out.push({ kind: 'month', label: format(new Date(e.created_at), 'MMMM yyyy') });
      }
      out.push({ kind: 'entry', entry: e });
    }
    return out;
  }, [entries]);

  const verseLine = dailyVerseText?.[0]?.text ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        left={
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingLeft: 12 }}>
            <SelahMark size={20} />
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: t.ink }}>Selah</Text>
          </View>
        }
        right={
          <View style={{ flexDirection: 'row' }}>
            <IconButton name="search" label="Search" onPress={() => router.push('/search')} />
            <IconButton name="settings" label="Settings" onPress={() => router.push('/settings')} />
          </View>
        }
      />

      <FlatList
        data={rows}
        keyExtractor={(row, i) => (row.kind === 'entry' ? row.entry.id : `m-${row.label}-${i}`)}
        contentContainerStyle={{ paddingBottom: 140 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 }}>
            <Overline>{format(new Date(), 'EEEE, MMMM d')}</Overline>
            {verseLine ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/passage', params: { v: encodeVerseParam(dailyVerse) } })}
                style={{ marginTop: 14 }}
              >
                <Text
                  style={{ fontFamily: fonts.serifItalic, fontSize: 17, lineHeight: 28, color: t.inkSoft }}
                  numberOfLines={3}
                >
                  “{verseLine.trim()}”
                </Text>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, color: t.accent, marginTop: 8 }}>
                  {formatRefShort(dailyVerse)}
                </Text>
              </Pressable>
            ) : null}

            {memories && memories.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/entry/${memories[0].id}`)}
                style={{ marginTop: 22, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}
              >
                <Overline style={{ color: t.gold }}>On this day</Overline>
                <Text
                  numberOfLines={1}
                  style={{ fontFamily: fonts.ui, fontSize: 13, color: t.inkFaint, flexShrink: 1 }}
                >
                  {memories[0].title || 'A past reflection'} · {format(new Date(memories[0].created_at), 'yyyy')} →
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
        renderItem={({ item }) =>
          item.kind === 'month' ? (
            <Overline style={{ paddingHorizontal: 24, paddingTop: 30, paddingBottom: 6 }}>
              {item.label}
            </Overline>
          ) : (
            <EntryCard entry={item.entry} onPress={() => router.push(`/entry/${item.entry.id}`)} />
          )
        }
        ListEmptyComponent={
          <EmptyState
            title="Nothing written yet."
            hint="Selah means pause. Your first entry is one tap away."
          />
        }
      />

      <BottomBar />
    </View>
  );
}
