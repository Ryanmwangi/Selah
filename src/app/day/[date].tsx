import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { FlatList, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { EntryCard } from '../../components/EntryCard';
import { IconButton } from '../../components/IconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useDb } from '../../db/DbProvider';
import { searchEntries } from '../../repo/entries';
import { useTheme } from '../../theme/ThemeContext';

/** All entries written on one calendar day. */
export default function Day() {
  const t = useTheme();
  const { journal } = useDb();
  const { date } = useLocalSearchParams<{ date: string }>();

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date ?? '');
  const { data: entries } = useQuery({
    queryKey: ['day', date],
    queryFn: () => {
      const [y, m, d] = date.split('-').map(Number);
      const from = new Date(y, m - 1, d).getTime();
      const to = new Date(y, m - 1, d + 1).getTime();
      return searchEntries(journal, { from, to, includeArchived: true });
    },
    enabled: valid,
  });

  const title = valid ? format(new Date(date + 'T12:00:00'), 'MMMM d, yyyy') : 'Unknown day';

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title={title}
        left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} size={24} />}
      />
      <FlatList
        data={entries ?? []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 60 }}
        renderItem={({ item }) => (
          <EntryCard entry={item} onPress={() => router.push(`/entry/${item.id}`)} />
        )}
        ListEmptyComponent={<EmptyState title="Nothing written this day." />}
      />
    </View>
  );
}
