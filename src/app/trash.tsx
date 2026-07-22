import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { router } from 'expo-router';
import React from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { IconButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Ui } from '../components/Typ';
import { useDb } from '../db/DbProvider';
import { snippet } from '../lib/markdown';
import { deletePhotoFile } from '../lib/photos';
import {
  deleteEntry, listDeleted, restoreEntry, TRASH_RETENTION_DAYS, TRASH_RETENTION_MS,
} from '../repo/entries';
import type { EntryWithMeta } from '../repo/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';

function daysLeft(deletedAt: number, now: number): number {
  return Math.max(0, Math.ceil((deletedAt + TRASH_RETENTION_MS - now) / (24 * 60 * 60 * 1000)));
}

/** Recently deleted: a quiet recovery shelf before entries are gone forever. */
export default function Trash() {
  const t = useTheme();
  const { journal } = useDb();
  const queryClient = useQueryClient();
  const now = Date.now();

  const { data: entries } = useQuery({
    queryKey: ['trash'],
    queryFn: () => listDeleted(journal),
  });

  const restore = async (e: EntryWithMeta) => {
    await restoreEntry(journal, e.id);
    await queryClient.invalidateQueries();
  };

  const deleteForever = (e: EntryWithMeta) =>
    Alert.alert('Delete forever?', 'This entry and its photos will be gone for good.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete forever',
        style: 'destructive',
        onPress: async () => {
          for (const a of e.attachments) deletePhotoFile(a.filename);
          await deleteEntry(journal, e.id);
          await queryClient.invalidateQueries();
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title="Recently deleted"
        left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} size={24} />}
      />
      <Ui style={{ paddingHorizontal: 28, paddingBottom: 8, color: t.inkFaint }}>
        Entries stay here for {TRASH_RETENTION_DAYS} days, then delete forever on their own.
      </Ui>
      <FlatList
        data={entries ?? []}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 60 }}
        renderItem={({ item }) => {
          const left = daysLeft(item.deleted_at ?? now, now);
          return (
            <View style={{ paddingHorizontal: 28, paddingVertical: 14, gap: 6 }}>
              {item.title ? (
                <Text style={{ fontFamily: fonts.displayMedium, fontSize: 16, color: t.ink }} numberOfLines={1}>
                  {item.title}
                </Text>
              ) : null}
              <Text
                style={{ fontFamily: fonts.serif, fontSize: 14, lineHeight: 22, color: t.inkSoft }}
                numberOfLines={2}
              >
                {snippet(item.body) || 'No text'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 2 }}>
                <Ui style={{ color: left <= 1 ? t.danger : t.inkFaint, fontSize: 12 }}>
                  {format(new Date(item.created_at), 'MMM d')} · {left === 0 ? 'deleting soon' : `${left} ${left === 1 ? 'day' : 'days'} left`}
                </Ui>
                <Pressable
                  onPress={() => void restore(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Restore entry"
                  hitSlop={8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <Feather name="rotate-ccw" size={13} color={t.accent} />
                  <Text style={{ fontFamily: fonts.uiSemi, fontSize: 13, color: t.accent }}>Restore</Text>
                </Pressable>
                <Pressable
                  onPress={() => deleteForever(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Delete forever"
                  hitSlop={8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                >
                  <Feather name="trash-2" size={13} color={t.danger} />
                  <Text style={{ fontFamily: fonts.uiSemi, fontSize: 13, color: t.danger }}>Delete now</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<EmptyState title="Nothing waiting here." hint="Deleted entries rest here for a week first." />}
      />
    </View>
  );
}
