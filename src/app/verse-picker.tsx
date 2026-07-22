import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { IconButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Overline, Serif, Ui } from '../components/Typ';
import { useDb } from '../db/DbProvider';
import { track } from '../lib/analytics';
import { newId } from '../lib/ids';
import { NT, OT, type Book } from '../lib/scripture/books';
import { formatRef, parseRef, type VerseRef } from '../lib/scripture/refs';
import { translationAbbrev } from '../lib/scripture/translations';
import { getPassage, verseCount } from '../repo/scripture';
import { useDraftStore } from '../state/draftStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';

/**
 * Attach a verse in two steps, always: choose (type a reference, or browse
 * book, chapter, verses), then read the full passage and confirm. Nothing
 * is attached until the user has seen the words.
 */
export default function VersePicker() {
  const t = useTheme();
  const { scripture, scriptureId } = useDb();
  const [input, setInput] = useState('');
  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [start, setStart] = useState<number | null>(null);
  const [pending, setPending] = useState<VerseRef | null>(null);

  const typedRef = useMemo(() => (input.trim() ? parseRef(input) : null), [input]);

  const { data: maxVerse } = useQuery({
    queryKey: ['verseCount', scriptureId, book?.id, chapter],
    queryFn: () => verseCount(scripture, book!.id, chapter!),
    enabled: book != null && chapter != null,
  });

  // the passage being previewed: an explicit browse selection, or the typed ref
  const previewRef = pending ?? typedRef;
  const { data: preview } = useQuery({
    queryKey: ['pickerPreview', scriptureId, previewRef],
    queryFn: () => getPassage(scripture, previewRef!),
    enabled: previewRef != null,
  });

  const attach = (ref: VerseRef) => {
    useDraftStore.getState().addVerse({ key: newId(), ref });
    track('verse_attached');
    router.back();
  };

  const cell = (active: boolean) =>
    ({
      width: 44, height: 44, margin: 4, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: active ? t.accent : t.surfaceAlt,
    }) as const;

  // ── confirm step: the full passage, read before attaching ──────────────
  if (pending) {
    const ok = preview != null && preview.length > 0;
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <ScreenHeader
          title={formatRef(pending)}
          left={<IconButton name="chevron-left" label="Choose a different passage" onPress={() => setPending(null)} size={24} />}
        />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 4, paddingBottom: 24 }}>
          {ok ? (
            <View
              style={{
                backgroundColor: t.verseBg, borderLeftWidth: 2, borderLeftColor: t.verseRule,
                borderRadius: 8, paddingHorizontal: 18, paddingVertical: 14,
              }}
            >
              <Overline style={{ color: t.gold, marginBottom: 8 }}>
                {preview.length} {preview.length === 1 ? 'verse' : 'verses'} · {translationAbbrev(scriptureId)}
              </Overline>
              <Serif style={{ fontSize: 16, lineHeight: 27 }}>
                {preview.map((v, i) => (
                  <Text key={v.verse}>
                    {i > 0 ? ' ' : ''}
                    <Text style={{ fontFamily: fonts.uiSemi, fontSize: 10, color: t.gold }}>{v.verse} </Text>
                    {v.text}
                  </Text>
                ))}
              </Serif>
            </View>
          ) : (
            <Ui style={{ color: t.inkFaint }}>Loading the passage…</Ui>
          )}
        </ScrollView>
        <View
          style={{
            flexDirection: 'row', gap: 12, paddingHorizontal: 28, paddingBottom: 34, paddingTop: 10,
          }}
        >
          <Pressable
            onPress={() => setPending(null)}
            accessibilityRole="button"
            style={{
              flex: 1, alignItems: 'center', paddingVertical: 13,
              borderRadius: 12, borderWidth: 1, borderColor: t.hairline,
            }}
          >
            <Text style={{ fontFamily: fonts.uiSemi, fontSize: 14.5, color: t.inkSoft }}>Not this one</Text>
          </Pressable>
          <Pressable
            onPress={() => ok && attach(pending)}
            disabled={!ok}
            accessibilityRole="button"
            style={{
              flex: 2, alignItems: 'center', paddingVertical: 13,
              borderRadius: 12, backgroundColor: t.accent, opacity: ok ? 1 : 0.5,
            }}
          >
            <Text style={{ fontFamily: fonts.uiSemi, fontSize: 14.5, color: t.name === 'dawn' ? '#FCFBFE' : '#1D1B26' }}>
              Attach {formatRef(pending)}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── choose step ────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title="Attach scripture"
        left={<IconButton name="x" label="Close" onPress={() => router.back()} size={22} />}
      />

      <View style={{ paddingHorizontal: 24, gap: 10 }}>
        <TextInput
          placeholder={'Type a reference, like "Ps 46:10"'}
          placeholderTextColor={t.inkFaint}
          value={input}
          onChangeText={setInput}
          autoCapitalize="none"
          style={{
            fontFamily: fonts.ui, fontSize: 16, color: t.ink,
            borderWidth: 1, borderColor: t.hairline, borderRadius: 10,
            paddingHorizontal: 14, paddingVertical: 11, backgroundColor: t.surface,
          }}
          accessibilityLabel="Scripture reference"
        />
        {typedRef && preview && preview.length > 0 ? (
          <Pressable
            onPress={() => setPending(typedRef)}
            accessibilityRole="button"
            accessibilityLabel={`Preview ${formatRef(typedRef)}`}
            style={{ backgroundColor: t.verseBg, borderRadius: 10, padding: 14, gap: 6 }}
          >
            <Overline style={{ color: t.gold }}>{formatRef(typedRef)}</Overline>
            <Serif numberOfLines={2} style={{ fontSize: 15, lineHeight: 24 }}>
              {preview.map((p) => p.text).join(' ')}
            </Serif>
            <Text style={{ fontFamily: fonts.uiSemi, fontSize: 13, color: t.accent, marginTop: 2 }}>
              Read &amp; confirm
            </Text>
          </Pressable>
        ) : input.trim() && !typedRef ? (
          <Ui style={{ color: t.inkFaint }}>Keep typing: book, then chapter:verse.</Ui>
        ) : null}
      </View>

      {book == null ? (
        <FlatList
          style={{ marginTop: 14 }}
          data={[...OT, ...NT]}
          keyExtractor={(bk) => String(bk.id)}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item: bk, index }) => (
            <>
              {index === 0 || index === OT.length ? (
                <Overline style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 6 }}>
                  {index === 0 ? 'Old Testament' : 'New Testament'}
                </Overline>
              ) : null}
              <Pressable
                onPress={() => setBook(bk)}
                accessibilityRole="button"
                style={({ pressed }) => ({
                  paddingHorizontal: 24, paddingVertical: 11,
                  backgroundColor: pressed ? t.surfaceAlt : 'transparent',
                })}
              >
                <Text style={{ fontFamily: fonts.serif, fontSize: 16, color: t.ink }}>{bk.name}</Text>
              </Pressable>
            </>
          )}
        />
      ) : (
        <ScrollView style={{ marginTop: 14 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 }}>
            <IconButton
              name="chevron-left"
              label="Back"
              onPress={() => {
                if (start != null) setStart(null);
                else if (chapter != null) setChapter(null);
                else setBook(null);
              }}
            />
            <Text style={{ fontFamily: fonts.display, fontSize: 18, color: t.ink }}>
              {book.name}
              {chapter ? ` ${chapter}` : ''}
              {start ? `:${start}` : ''}
            </Text>
          </View>

          {chapter == null ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingTop: 8 }}>
              {Array.from({ length: book.chapters }, (_, i) => i + 1).map((c) => (
                <Pressable key={c} onPress={() => setChapter(c)} accessibilityRole="button" style={cell(false)}>
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 15, color: t.ink }}>{c}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={{ paddingTop: 8, gap: 10 }}>
              <Ui style={{ paddingHorizontal: 4, color: t.inkFaint }}>
                {start == null
                  ? 'Tap a verse, or preview the whole chapter.'
                  : `Now tap the last verse of the range (or ${start} again for just that verse).`}
              </Ui>
              <Pressable
                onPress={() => setPending({ book: book.id, chapter, verseStart: null, verseEnd: null })}
                accessibilityRole="button"
                style={{ alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 4 }}
              >
                <Text style={{ fontFamily: fonts.uiSemi, fontSize: 13, color: t.accent }}>
                  Preview all of {book.name} {chapter}
                </Text>
              </Pressable>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {Array.from({ length: maxVerse ?? 0 }, (_, i) => i + 1).map((verse) => (
                  <Pressable
                    key={verse}
                    accessibilityRole="button"
                    onPress={() => {
                      if (start == null) setStart(verse);
                      else {
                        setPending({
                          book: book.id,
                          chapter,
                          verseStart: Math.min(start, verse),
                          verseEnd: verse === start ? null : Math.max(start, verse),
                        });
                        setStart(null);
                      }
                    }}
                    style={cell(start === verse)}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.uiMedium, fontSize: 15,
                        color: start === verse ? t.bg : t.ink,
                      }}
                    >
                      {verse}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
