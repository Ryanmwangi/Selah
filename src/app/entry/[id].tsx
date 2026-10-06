import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { IconButton } from '../../components/IconButton';
import { MarkdownView } from '../../components/MarkdownView';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Display, Overline, Ui } from '../../components/Typ';
import { VerseCard } from '../../components/VerseCard';
import { useDb } from '../../db/DbProvider';
import { track } from '../../lib/analytics';
import { VoiceNote } from '../../components/VoiceNote';
import { parseBody, voiceMarker } from '../../lib/bodyBlocks';
import { photoUri } from '../../lib/photos';
import { encodeVerseParam } from '../../lib/routeParams';
import {
  getEntryWithMeta, setArchived, setPinned, softDeleteEntry, TRASH_RETENTION_DAYS,
} from '../../repo/entries';
import { linkToRef } from '../../repo/verseLinks';
import { useTheme } from '../../theme/ThemeContext';
import { MOOD_META } from '../../theme/tokens';

export default function EntryReader() {
  const t = useTheme();
  const { journal } = useDb();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: entry, isLoading } = useQuery({
    queryKey: ['entry', id],
    queryFn: () => getEntryWithMeta(journal, id),
  });

  if (isLoading) return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  if (!entry) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <ScreenHeader left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} />} />
        <EmptyState title="This entry is gone." />
      </View>
    );
  }

  const d = new Date(entry.created_at);
  const moodLabels = entry.moods.map((m) => MOOD_META[m]?.label).filter(Boolean).join(' · ');
  const invalidate = () => queryClient.invalidateQueries();
  // tapping the writing goes straight to editing, cursor in the text
  const editHere = (focus: 'title' | 'body' = 'body') =>
    router.push({ pathname: '/compose', params: { id: entry.id, focus } });

  const confirmDelete = () =>
    Alert.alert(
      'Delete entry?',
      `It moves to Recently Deleted (in Settings) and can be restored for ${TRASH_RETENTION_DAYS} days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await softDeleteEntry(journal, entry.id, Date.now());
            track('entry_deleted');
            await invalidate();
            router.back();
          },
        },
      ],
    );

  const confirmArchive = () => {
    if (entry.is_archived) {
      // unarchive silently, it is a purely additive action
      void (async () => {
        await setArchived(journal, entry.id, false);
        await invalidate();
      })();
      return;
    }
    Alert.alert(
      'Archive entry?',
      'It leaves your timeline and search stays quiet about it. Find it anytime under Settings, Archived.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            await setArchived(journal, entry.id, true);
            await invalidate();
            router.back();
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} size={24} />}
        right={
          <View style={{ flexDirection: 'row' }}>
            <IconButton
              name="bookmark"
              label={entry.is_pinned ? 'Unpin' : 'Pin'}
              color={entry.is_pinned ? t.gold : t.inkFaint}
              onPress={async () => {
                await setPinned(journal, entry.id, !entry.is_pinned);
                await invalidate();
              }}
            />
            <IconButton
              name="archive"
              label={entry.is_archived ? 'Unarchive' : 'Archive'}
              color={entry.is_archived ? t.accent : t.inkFaint}
              onPress={confirmArchive}
            />
            <IconButton name="trash-2" label="Delete" color={t.inkFaint} onPress={confirmDelete} />
            <IconButton
              name="edit-3"
              label="Edit"
              color={t.accent}
              onPress={() => router.push({ pathname: '/compose', params: { id: entry.id } })}
            />
          </View>
        }
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 6, paddingBottom: 80, gap: 20 }}>
        <View style={{ gap: 8 }}>
          <Overline>{format(d, 'EEEE, MMMM d, yyyy')}</Overline>
          {moodLabels || entry.place_name ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              {moodLabels ? <Ui style={{ color: t.inkFaint }}>{moodLabels}</Ui> : null}
              {entry.place_name ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {moodLabels ? <Ui style={{ color: t.inkFaint }}>·</Ui> : null}
                  <Feather name="map-pin" size={11} color={t.gold} />
                  <Ui style={{ color: t.inkFaint }}>{entry.place_name}</Ui>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {entry.title ? (
          <Pressable onPress={() => editHere('title')} accessibilityRole="button" accessibilityLabel="Edit title">
            <Display>{entry.title}</Display>
          </Pressable>
        ) : null}

        {entry.verseLinks.map((l) => {
          const ref = linkToRef(l);
          return (
            <VerseCard
              key={l.id}
              refv={ref}
              onPressRef={() => router.push({ pathname: '/passage', params: { v: encodeVerseParam(ref) } })}
            />
          );
        })}

        {parseBody(entry.body).map((b, i) => {
          if (b.kind === 'text') {
            return b.text.trim() ? (
              <Pressable key={`t${i}`} onPress={() => editHere('body')} accessibilityRole="button" accessibilityLabel="Edit entry">
                <MarkdownView body={b.text} />
              </Pressable>
            ) : null;
          }
          const a = entry.attachments.find((x) => x.id === b.id);
          return a ? <VoiceNote key={a.id} filename={a.filename} durationMs={a.duration_ms} label={a.label} /> : null;
        })}

        {/* voice notes saved before inline placement have no marker in the body */}
        {entry.attachments
          .filter((a) => a.type === 'audio' && !entry.body.includes(voiceMarker(a.id)))
          .map((a) => (
            <VoiceNote key={a.id} filename={a.filename} durationMs={a.duration_ms} label={a.label} />
          ))}

        {entry.attachments.some((a) => a.type !== 'audio') ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {entry.attachments.filter((a) => a.type !== 'audio').map((a) => {
              const ratio = a.width && a.height ? a.width / a.height : 1;
              return (
                <Image
                  key={a.id}
                  source={{ uri: photoUri(a.filename) }}
                  style={{ height: 220, width: Math.min(300, Math.max(150, 220 * ratio)), borderRadius: 14 }}
                  contentFit="cover"
                  accessibilityLabel="Journal photo"
                />
              );
            })}
          </ScrollView>
        ) : null}

        {entry.tags.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {entry.tags.map((tag) => (
              <Ui key={tag.id} style={{ color: t.inkFaint }}>
                #{tag.name}
              </Ui>
            ))}
          </View>
        ) : null}
        {/* empty space under the entry also starts editing */}
        <Pressable onPress={() => editHere('body')} accessibilityLabel="Edit entry" style={{ minHeight: 60 }} />
      </ScrollView>
    </View>
  );
}
