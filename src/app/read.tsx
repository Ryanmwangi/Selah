import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useRef } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { IconButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Ui } from '../components/Typ';
import { useDb } from '../db/DbProvider';
import { BOOKS, bookById } from '../lib/scripture/books';
import { encodeVerseParam } from '../lib/routeParams';
import { getPassage } from '../repo/scripture';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';

interface ChapterRef {
  book: number;
  chapter: number;
}

/** Previous/next chapter across the whole canon (rolls into adjacent books). */
function neighbor(ref: ChapterRef, dir: -1 | 1): ChapterRef | null {
  const book = bookById(ref.book);
  if (!book) return null;
  const nextChapter = ref.chapter + dir;
  if (nextChapter >= 1 && nextChapter <= book.chapters) return { book: ref.book, chapter: nextChapter };
  const idx = BOOKS.findIndex((b) => b.id === ref.book);
  const adj = BOOKS[idx + dir];
  if (!adj) return null;
  return { book: adj.id, chapter: dir === 1 ? 1 : adj.chapters };
}

export default function Read() {
  const t = useTheme();
  const { scripture } = useDb();
  const params = useLocalSearchParams<{ book?: string; chapter?: string }>();
  const scrollRef = useRef<ScrollView>(null);

  const ref = useMemo<ChapterRef | null>(() => {
    const book = Number(params.book);
    const chapter = Number(params.chapter);
    if (!bookById(book) || !Number.isInteger(chapter) || chapter < 1) return null;
    const b = bookById(book)!;
    if (chapter > b.chapters) return null;
    return { book, chapter };
  }, [params.book, params.chapter]);

  const { data: verses } = useQuery({
    queryKey: ['chapter', ref?.book, ref?.chapter],
    queryFn: () => getPassage(scripture, { book: ref!.book, chapter: ref!.chapter, verseStart: null, verseEnd: null }),
    enabled: ref != null,
  });

  if (!ref) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <ScreenHeader left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} />} />
        <EmptyState title="Passage not found." />
      </View>
    );
  }

  const book = bookById(ref.book)!;
  const prev = neighbor(ref, -1);
  const next = neighbor(ref, 1);
  const go = (n: ChapterRef | null) => {
    if (!n) return;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    router.setParams({ book: String(n.book), chapter: String(n.chapter) });
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title={`${book.name} ${ref.chapter}`}
        left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} size={24} />}
        right={
          <IconButton
            name="edit-3"
            label="Reflect on this chapter"
            color={t.accent}
            onPress={() =>
              router.push({
                pathname: '/compose',
                params: { v: encodeVerseParam({ book: ref.book, chapter: ref.chapter, verseStart: null, verseEnd: null }) },
              })
            }
          />
        }
      />
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 40 }}>
        <Text style={{ fontFamily: fonts.serif, fontSize: 18, lineHeight: 31, color: t.ink, paddingTop: 6 }}>
          {(verses ?? []).map((vv) => (
            <Text key={vv.verse}>
              <Text style={{ fontFamily: fonts.uiSemi, fontSize: 11, color: t.gold }}>{vv.verse} </Text>
              {vv.text}
              {'  '}
            </Text>
          ))}
        </Text>
        <Ui style={{ color: t.inkFaint, textAlign: 'center', paddingTop: 18 }}>
          World English Bible · public domain
        </Ui>
      </ScrollView>

      {/* prev / next chapter */}
      <View
        style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          paddingHorizontal: 20, paddingVertical: 10, borderTopWidth: 1, borderTopColor: t.hairline,
        }}
      >
        <ChapterButton dir="prev" ref={prev} onPress={() => go(prev)} />
        <Pressable onPress={() => router.push('/bible')} accessibilityRole="button" hitSlop={8}>
          <Feather name="book" size={18} color={t.inkSoft} />
        </Pressable>
        <ChapterButton dir="next" ref={next} onPress={() => go(next)} />
      </View>
    </View>
  );
}

function ChapterButton({ dir, ref, onPress }: { dir: 'prev' | 'next'; ref: ChapterRef | null; onPress: () => void }) {
  const t = useTheme();
  if (!ref) return <View style={{ width: 90 }} />;
  const book = bookById(ref.book)!;
  const label = `${book.abbrev} ${ref.chapter}`;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${dir === 'prev' ? 'Previous' : 'Next'} chapter, ${label}`}
      hitSlop={8}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 6, width: 90,
        justifyContent: dir === 'prev' ? 'flex-start' : 'flex-end', opacity: pressed ? 0.5 : 1,
      })}
    >
      {dir === 'prev' ? <Feather name="chevron-left" size={16} color={t.accent} /> : null}
      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, color: t.accent }}>{label}</Text>
      {dir === 'next' ? <Feather name="chevron-right" size={16} color={t.accent} /> : null}
    </Pressable>
  );
}
