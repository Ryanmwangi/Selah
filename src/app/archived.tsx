import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { FlatList, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { EntryCard } from '../components/EntryCard';
import { IconButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Ui } from '../components/Typ';
import { useDb } from '../db/DbProvider';
import { searchEntries } from '../repo/entries';
import { useTheme } from '../theme/ThemeContext';

/** Entries the user has set aside. Open one to read, unarchive, or delete. */
export default function Archived() {
  const t = useTheme();
  const { journal } = useDb();

  const { data: entries } = useQuery({
    queryKey: ['archived'],
    queryFn: () => searchEntries(journal, { archivedOnly: true }),
  });

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title="Archived"
        left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} size={24} />}
      />
      <Ui style={{ paddingHorizontal: 28, paddingBottom: 8, color: t.inkFaint }}>
        Set aside, not gone. Open an entry to bring it back to your timeline.
      </Ui>
      <FlatList
        data={entries ?? []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 60 }}
        renderItem={({ item }) => (
          <EntryCard entry={item} onPress={() => router.push(`/entry/${item.id}`)} />
        )}
        ListEmptyComponent={<EmptyState title="Nothing archived." />}
      />
    </View>
  );
}
