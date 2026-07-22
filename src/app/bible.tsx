import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { IconButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Overline } from '../components/Typ';
import { BOOKS, NT, OT, type Book } from '../lib/scripture/books';
import { MOODS } from '../repo/types';
import { useTheme } from '../theme/ThemeContext';
import { fonts, MOOD_META } from '../theme/tokens';

/** Browse the whole Bible: read for how you feel, or pick a book and chapter. */
export default function Bible() {
  const t = useTheme();
  const [book, setBook] = useState<Book | null>(null);

  const cell = (active: boolean) =>
    ({
      width: 46, height: 46, margin: 4, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center', backgroundColor: t.surfaceAlt,
    }) as const;

  if (book) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <ScreenHeader
          title={book.name}
          left={<IconButton name="chevron-left" label="All books" onPress={() => setBook(null)} size={24} />}
        />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}>
          <Overline style={{ paddingBottom: 8, paddingLeft: 4 }}>Chapter</Overline>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {Array.from({ length: book.chapters }, (_, i) => i + 1).map((c) => (
              <Pressable
                key={c}
                onPress={() => router.push({ pathname: '/read', params: { book: String(book.id), chapter: String(c) } })}
                accessibilityRole="button"
                accessibilityLabel={`${book.name} ${c}`}
                style={cell(false)}
              >
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 15, color: t.ink }}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title="Bible"
        left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} size={24} />}
      />
      <FlatList
        data={[...OT, ...NT]}
        keyExtractor={(b) => String(b.id)}
        contentContainerStyle={{ paddingBottom: 60 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 24, paddingBottom: 8 }}>
            <Overline style={{ paddingBottom: 12 }}>Reading for how you feel</Overline>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MOODS.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => router.push({ pathname: '/mood/[mood]', params: { mood: m } })}
                  accessibilityRole="button"
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 7,
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18,
                    borderWidth: 1, borderColor: t.hairline,
                  }}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: MOOD_META[m].dot }} />
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, color: t.inkSoft }}>
                    {MOOD_META[m].label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Overline style={{ paddingTop: 26, paddingBottom: 2 }}>Old Testament</Overline>
          </View>
        }
        renderItem={({ item, index }) => (
          <>
            {index === OT.length ? (
              <Overline style={{ paddingHorizontal: 24, paddingTop: 22, paddingBottom: 2 }}>
                New Testament
              </Overline>
            ) : null}
            <Pressable
              onPress={() => setBook(item)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                paddingHorizontal: 24, paddingVertical: 12,
                backgroundColor: pressed ? t.surfaceAlt : 'transparent',
              })}
            >
              <Text style={{ fontFamily: fonts.serif, fontSize: 16.5, color: t.ink }}>{item.name}</Text>
            </Pressable>
          </>
        )}
      />
    </View>
  );
}
