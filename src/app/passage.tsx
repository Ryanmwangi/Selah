import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { FlatList, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { EntryCard } from '../components/EntryCard';
import { IconButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Overline } from '../components/Typ';
import { VerseCard } from '../components/VerseCard';
import { useDb } from '../db/DbProvider';
import { decodeVerseParam } from '../lib/routeParams';
import { formatRef } from '../lib/scripture/refs';
import { entriesForPassage } from '../repo/entries';
import { useTheme } from '../theme/ThemeContext';

/** Everything you have ever written on a passage. */
export default function Passage() {
  const t = useTheme();
  const { journal } = useDb();
  const { v } = useLocalSearchParams<{ v: string }>();
  const ref = decodeVerseParam(v);

  const { data: entries } = useQuery({
    queryKey: ['passageEntries', v],
    queryFn: () => entriesForPassage(journal, ref!.book, ref!.chapter, ref!.verseStart ?? undefined),
    enabled: ref != null,
  });

  if (!ref) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <ScreenHeader left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} />} />
        <EmptyState title="Unknown passage." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title={formatRef(ref)}
        left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} size={24} />}
      />
      <FlatList
        data={entries ?? []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingBottom: 60 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingBottom: 10, gap: 10 }}>
            <VerseCard refv={ref} />
            {entries && entries.length > 0 ? (
              <Overline>
                {entries.length} {entries.length === 1 ? 'reflection' : 'reflections'}
              </Overline>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <EntryCard entry={item} onPress={() => router.push(`/entry/${item.id}`)} />
        )}
        ListEmptyComponent={
          <EmptyState title="No reflections here yet." hint="What is this passage saying to you today?" />
        }
      />
    </View>
  );
}
