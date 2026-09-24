import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { IconButton } from '../components/IconButton';
import { VoiceNote } from '../components/VoiceNote';
import { MoodPicker } from '../components/MoodPicker';
import { ScreenHeader } from '../components/ScreenHeader';
import { Overline, Ui } from '../components/Typ';
import { VerseChip } from '../components/VerseChip';
import { useDb } from '../db/DbProvider';
import { track } from '../lib/analytics';
import { newId } from '../lib/ids';
import { insertVoice, moveVoiceToLine, parseBody, removeVoice as removeVoiceBlock, serializeBlocks, voiceMarker } from '../lib/bodyBlocks';
import { captureCurrentPlace } from '../lib/location';
import { deletePhotoFile, photoUri, pickPhotos } from '../lib/photos';
import { formatDuration, storeRecording } from '../lib/voice';
import { decodeVerseParams } from '../lib/routeParams';
import { addAttachment, removeAttachment, setAttachmentLabel } from '../repo/attachments';
import { createEntry, deleteEntry, getEntryWithMeta, setEntryMoods, updateEntry } from '../repo/entries';
import { ensureTag, setEntryTags } from '../repo/tags';
import { refreshWidget } from '../repo/widget';
import { linkToRef, setEntryVerseLinks } from '../repo/verseLinks';
import { useDraftStore } from '../state/draftStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, MOOD_META } from '../theme/tokens';

const AUTOSAVE_MS = 700;

const BODY_TEXT = { fontFamily: fonts.serif, fontSize: 17, lineHeight: 28 } as const;

/** Voice notes saved before inline placement have no marker; keep them at the end. */
function withOrphanVoices(body: string, attachments: Array<{ id: string; type: string }>): string {
  const missing = attachments.filter((a) => a.type === 'audio' && !body.includes(voiceMarker(a.id)));
  if (missing.length === 0) return body;
  return serializeBlocks(parseBody(`${body}\n${missing.map((a) => voiceMarker(a.id)).join('\n')}`));
}

export default function Compose() {
  const t = useTheme();
  const { journal, scripture } = useDb();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string; v?: string; promptId?: string; focus?: string }>();
  const draft = useDraftStore();
  const [loaded, setLoaded] = useState(false);
  const [locating, setLocating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef<TextInput>(null);
  // where the cursor was last, so a new voice note lands in the text where the writer was
  const cursorRef = useRef<{ index: number; cursor: number } | null>(null);
  const pendingTag = useRef('');
  const scrollRef = useRef<ScrollView>(null);
  const scrollBox = useRef<View>(null);
  const scrollY = useRef(0);
  const scrollTop = useRef(0);
  const scrollHeight = useRef(0);
  const blockY = useRef<Record<number, number>>({});
  const lineLayouts = useRef<Record<number, Array<{ y: number; h: number }>>>({});
  const dragState = useRef({ startScroll: 0, moveY: 0, dy: 0, target: null as number | null });
  const dragTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragY = useRef(new Animated.Value(0)).current;
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropY, setDropY] = useState<number | null>(null);

  // ── bootstrap ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = useDraftStore.getState();
      if (params.id) {
        const existing = await getEntryWithMeta(journal, params.id);
        if (existing && !cancelled) {
          s.start({
            entryId: existing.id,
            title: existing.title ?? '',
            body: withOrphanVoices(existing.body, existing.attachments),
            moods: existing.moods,
            verses: existing.verseLinks.map((l) => ({ key: l.id, ref: linkToRef(l) })),
            tagNames: existing.tags.map((tag) => tag.name),
            photos: existing.attachments.filter((a) => a.type !== 'audio').map((a) => ({
              id: a.id, filename: a.filename, width: a.width, height: a.height, saved: true,
            })),
            voices: existing.attachments.filter((a) => a.type === 'audio').map((a) => ({
              id: a.id, filename: a.filename, durationMs: a.duration_ms ?? 0, label: a.label, saved: true,
            })),
            place: existing.place_name
              ? { placeName: existing.place_name, latitude: existing.latitude ?? 0, longitude: existing.longitude ?? 0 }
              : null,
          });
        }
      } else {
        // params.v may carry one ref or several (verses selected while reading)
        const refs = decodeVerseParams(params.v);
        let body = '';
        if (params.promptId) {
          const prompt = await journal.getFirstAsync<{ text: string }>(
            `SELECT text FROM prompts WHERE id = ?`, [params.promptId],
          );
          if (prompt) body = `> ${prompt.text}\n\n`;
        }
        if (cancelled) return;
        s.start({ body, verses: refs.map((ref) => ({ key: newId(), ref })) });
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── persistence ────────────────────────────────────────────────────────
  const persist = useCallback(async () => {
    const s = useDraftStore.getState();
    const hasContent =
      s.title.trim() !== '' || s.body.trim() !== '' || s.verses.length > 0 || s.photos.length > 0 || s.voices.length > 0;
    if (!s.entryId && !hasContent) return;
    let id = s.entryId;
    const now = Date.now();
    const place = s.place;
    if (!id) {
      id = newId();
      s.setEntryId(id);
      await createEntry(journal, {
        id, title: s.title.trim() || null, body: s.body, createdAt: now,
        placeName: place?.placeName ?? null, latitude: place?.latitude ?? null, longitude: place?.longitude ?? null,
      });
    } else {
      await updateEntry(journal, id, {
        title: s.title.trim() || null, body: s.body,
        placeName: place?.placeName ?? null, latitude: place?.latitude ?? null, longitude: place?.longitude ?? null,
      }, now);
    }
    await setEntryMoods(journal, id, s.moods);
    await setEntryVerseLinks(journal, id, s.verses.map((v) => ({ id: newId(), ref: v.ref })));
    const tagIds: string[] = [];
    for (const name of s.tagNames) tagIds.push((await ensureTag(journal, newId(), name)).id);
    await setEntryTags(journal, id, tagIds);
    for (const p of s.photos.filter((x) => !x.saved)) {
      await addAttachment(journal, {
        id: p.id, entryId: id, filename: p.filename, width: p.width, height: p.height, createdAt: now,
      });
      p.saved = true;
    }
    for (const v of s.voices.filter((x) => !x.saved)) {
      await addAttachment(journal, {
        id: v.id, entryId: id, filename: v.filename, type: 'audio', durationMs: v.durationMs, label: v.label, createdAt: now,
      });
      v.saved = true;
    }
    for (const v of s.voices.filter((x) => x.saved)) await setAttachmentLabel(journal, v.id, v.label);
    await queryClient.invalidateQueries();
    track('entry_saved');
    // keep a streak/verse widget current after each save (no-op without a widget)
    void refreshWidget(journal, scripture, Date.now()).catch(() => {});
  }, [journal, scripture, queryClient]);

  const scheduleSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void persist(), AUTOSAVE_MS);
  }, [persist]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void persist();
    },
    [persist],
  );

  const done = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    if (pendingTag.current.trim()) useDraftStore.getState().addTag(pendingTag.current);
    const s = useDraftStore.getState();
    const empty =
      !s.title.trim() && !s.body.trim() && s.verses.length === 0 && s.photos.length === 0 && s.voices.length === 0;
    if (!empty || s.entryId) await persist();
    if (s.entryId && empty) {
      await deleteEntry(journal, s.entryId);
      await queryClient.invalidateQueries();
    }
    useDraftStore.getState().clear();
    router.back();
  }, [persist, journal, queryClient]);

  // ── attach actions ─────────────────────────────────────────────────────
  const attachPhotos = async () => {
    const picked = await pickPhotos();
    if (picked.length) {
      useDraftStore.getState().addPhotos(picked.map((p) => ({ ...p, saved: false })));
      scheduleSave();
    }
  };

  const removePhoto = async (id: string, filename: string, saved: boolean) => {
    useDraftStore.getState().removePhoto(id);
    if (saved) await removeAttachment(journal, id);
    deletePhotoFile(filename);
    scheduleSave();
  };

  // ── voice notes ────────────────────────────────────────────────────────
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recState = useAudioRecorderState(recorder, 250);
  const [recording, setRecording] = useState(false);
  // native recorder objects are already released when unmount cleanups run, so track state ourselves
  const recordingRef = useRef(false);

  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone off', 'Allow microphone access in Settings to record voice notes.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordingRef.current = true;
      setRecording(true);
    } catch {
      Alert.alert('Could not record', 'Something went wrong starting the recording.');
    }
  };

  const stopRecording = async () => {
    recordingRef.current = false;
    setRecording(false);
    try {
      const ms = recorder.getStatus().durationMillis || recState.durationMillis;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const voice = storeRecording(recorder.uri, ms);
      if (voice) {
        const d = useDraftStore.getState();
        d.addVoice({ ...voice, label: null, saved: false });
        d.patch({ body: serializeBlocks(insertVoice(parseBody(d.body), voice.id, cursorRef.current)) });
        cursorRef.current = null;
        scheduleSave();
      }
    } catch {
      Alert.alert('Could not save', 'The recording could not be saved.');
    }
  };

  // a recording in progress when leaving the screen is discarded, not half-saved
  useEffect(
    () => () => {
      if (!recordingRef.current) return;
      try {
        void recorder.stop().catch(() => {});
      } catch {
        // already released with the screen
      }
    },
    [recorder],
  );

  const removeVoice = async (id: string, filename: string, saved: boolean) => {
    const d = useDraftStore.getState();
    d.patch({ body: serializeBlocks(removeVoiceBlock(parseBody(d.body), id)) });
    d.removeVoice(id);
    if (saved) await removeAttachment(journal, id);
    deletePhotoFile(filename);
    scheduleSave();
  };

  const toggleLocation = async () => {
    const s = useDraftStore.getState();
    if (s.place) {
      s.setPlace(null);
      scheduleSave();
      return;
    }
    setLocating(true);
    try {
      const place = await captureCurrentPlace();
      if (place) {
        useDraftStore.getState().setPlace(place);
        scheduleSave();
      }
    } finally {
      setLocating(false);
    }
  };

  const [tagInput, setTagInput] = useState('');

  const changeTagInput = (v: string) => {
    // typing a comma finishes the tag, like most tag fields
    if (v.includes(',')) {
      const name = v.split(',')[0].replace(/^#/, '').trim();
      if (name) useDraftStore.getState().addTag(name);
      pendingTag.current = '';
      setTagInput('');
      scheduleSave();
      return;
    }
    pendingTag.current = v;
    setTagInput(v);
  };

  const commitTag = () => {
    const name = pendingTag.current.replace(/^#/, '').trim();
    pendingTag.current = '';
    setTagInput('');
    if (!name) return;
    useDraftStore.getState().addTag(name);
    scheduleSave();
  };

  const setBlocks = (blocks: ReturnType<typeof parseBody>) => {
    useDraftStore.getState().patch({ body: serializeBlocks(blocks) });
    scheduleSave();
  };

  const blocks = parseBody(draft.body);
  const hasVoices = blocks.length > 1;

  // ── drag a voice note to any line ──────────────────────────────────────
  // Text blocks are TextInputs, which cannot report where each line sits, so
  // while voice notes exist we lay an invisible copy of the text under each
  // block (one <Text> per body line) and measure that instead.
  const dragBoundaries = () => {
    const out: Array<{ y: number; line: number }> = [];
    let g = 0;
    blocks.forEach((b, i) => {
      if (b.kind === 'voice') {
        g += 1;
        return;
      }
      const lines = b.text.split('\n');
      const top = blockY.current[i];
      const ll = lineLayouts.current[i] ?? [];
      if (top !== undefined) {
        lines.forEach((_, k) => {
          if (ll[k]) out.push({ y: top + ll[k].y, line: g + k });
        });
        const last = ll[lines.length - 1];
        if (last) out.push({ y: top + last.y + last.h, line: g + lines.length });
      }
      g += lines.length;
    });
    return out;
  };

  const updateDrag = () => {
    const d = dragState.current;
    dragY.setValue(d.dy + (scrollY.current - d.startScroll));
    const contentY = d.moveY - scrollTop.current + scrollY.current;
    let best: { y: number; line: number } | null = null;
    for (const c of dragBoundaries()) if (!best || Math.abs(c.y - contentY) < Math.abs(best.y - contentY)) best = c;
    d.target = best ? best.line : null;
    setDropY(best ? best.y : null);
  };

  const startDrag = (id: string) => {
    scrollBox.current?.measureInWindow((_x, y, _w, h) => {
      scrollTop.current = y;
      scrollHeight.current = h;
    });
    dragState.current = { startScroll: scrollY.current, moveY: 0, dy: 0, target: null };
    dragY.setValue(0);
    setDragId(id);
    // keep scrolling while a finger is held near the top or bottom edge
    dragTimer.current = setInterval(() => {
      const d = dragState.current;
      if (!d.moveY) return;
      const edge = 90;
      const dir = d.moveY < scrollTop.current + edge ? -1 : d.moveY > scrollTop.current + scrollHeight.current - edge ? 1 : 0;
      if (!dir) return;
      const next = Math.max(0, scrollY.current + dir * 10);
      scrollRef.current?.scrollTo({ y: next, animated: false });
      scrollY.current = next;
      updateDrag();
    }, 16);
  };

  const moveDrag = (moveY: number, dy: number) => {
    dragState.current.moveY = moveY;
    dragState.current.dy = dy;
    updateDrag();
  };

  const endDrag = (id: string) => {
    if (dragTimer.current) clearInterval(dragTimer.current);
    dragTimer.current = null;
    const target = dragState.current.target;
    setDragId(null);
    setDropY(null);
    dragY.setValue(0);
    if (target !== null) {
      const d = useDraftStore.getState();
      const next = moveVoiceToLine(d.body, id, target);
      if (next !== d.body) {
        d.patch({ body: next });
        scheduleSave();
      }
    }
  };

  useEffect(
    () => () => {
      if (dragTimer.current) clearInterval(dragTimer.current);
    },
    [],
  );

  if (!loaded) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const actionIcon = (
    name: keyof typeof Feather.glyphMap,
    label: string,
    onPress: () => void,
    active = false,
  ) => (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 42, height: 42, borderRadius: 21,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: active ? t.accentSoft : 'transparent',
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Feather name={name} size={19} color={active ? t.accent : t.inkSoft} />
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        left={<IconButton name="chevron-left" label="Back" onPress={done} size={24} />}
        right={<IconButton name="check" label="Done" onPress={done} size={24} color={t.accent} />}
      />
      <View ref={scrollBox} style={{ flex: 1 }} collapsable={false}>
      <ScrollView
        ref={scrollRef}
        scrollEnabled={dragId === null}
        scrollEventThrottle={16}
        onScroll={(e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
        }}
        contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 24, gap: 18 }}
        keyboardShouldPersistTaps="handled"
      >
        <Overline>{format(new Date(), 'EEEE, MMMM d')}</Overline>

        <TextInput
          placeholder="Title"
          placeholderTextColor={t.inkFaint}
          value={draft.title}
          onChangeText={(v) => {
            draft.patch({ title: v });
            scheduleSave();
          }}
          style={{ fontFamily: fonts.display, fontSize: 23, color: t.ink }}
          returnKeyType="next"
          onSubmitEditing={() => bodyRef.current?.focus()}
          accessibilityLabel="Entry title"
        />

        {draft.verses.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {draft.verses.map((v) => (
              <VerseChip
                key={v.key}
                refv={v.ref}
                onRemove={() => {
                  draft.removeVerse(v.key);
                  scheduleSave();
                }}
              />
            ))}
          </View>
        ) : null}

        {blocks.map((b, i) =>
          b.kind === 'text' ? (
            <View key={`t${i}`} onLayout={(e) => { blockY.current[i] = e.nativeEvent.layout.y; }}>
              <TextInput
                ref={i === 0 ? bodyRef : undefined}
                value={b.text}
                onChangeText={(v) => setBlocks(blocks.map((x, k) => (k === i ? { kind: 'text', text: v } : x)))}
                onSelectionChange={(e) => {
                  cursorRef.current = { index: i, cursor: e.nativeEvent.selection.start };
                }}
                multiline
                autoFocus={params.id ? params.focus === '1' && i === blocks.length - 1 : i === 0}
                textAlignVertical="top"
                scrollEnabled={false}
                style={{
                  ...BODY_TEXT, padding: 0, color: t.ink,
                  minHeight: blocks.length === 1 ? 200 : i === blocks.length - 1 ? 80 : 28,
                }}
                accessibilityLabel={i === 0 ? 'Entry body' : 'Entry text'}
              />
              {hasVoices ? (
                <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 }}>
                  {b.text.split('\n').map((line, k) => (
                    <Text
                      key={k}
                      onLayout={(e) => {
                        const { y, height } = e.nativeEvent.layout;
                        (lineLayouts.current[i] ??= [])[k] = { y, h: height };
                      }}
                      style={BODY_TEXT}
                    >
                      {line || ' '}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <React.Fragment key={`v${b.id}`}>{(() => {
              const v = draft.voices.find((x) => x.id === b.id);
              if (!v) return null;
              return (
                <VoiceNote
                  key={b.id}
                  filename={v.filename}
                  durationMs={v.durationMs}
                  label={v.label}
                  onRename={(label) => {
                    draft.renameVoice(v.id, label);
                    scheduleSave();
                  }}
                  onRemove={() => void removeVoice(v.id, v.filename, v.saved)}
                  onDragStart={() => startDrag(v.id)}
                  onDragMove={moveDrag}
                  onDragEnd={() => endDrag(v.id)}
                  dragY={dragY}
                  dragging={dragId === v.id}
                />
              );
            })()}</React.Fragment>
          ),
        )}

        {dropY !== null ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute', left: 20, right: 20, top: dropY - 1, height: 3, borderRadius: 2,
              backgroundColor: t.accent,
            }}
          />
        ) : null}

        {draft.photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {draft.photos.map((p) => (
              <View key={p.id}>
                <Image
                  source={{ uri: photoUri(p.filename) }}
                  style={{ width: 92, height: 92, borderRadius: 12 }}
                  contentFit="cover"
                  accessibilityLabel="Attached photo"
                />
                <Pressable
                  onPress={() => void removePhoto(p.id, p.filename, p.saved)}
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  style={{
                    position: 'absolute', top: -6, right: -6, width: 22, height: 22,
                    borderRadius: 11, backgroundColor: t.ink,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Feather name="x" size={12} color={t.bg} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {draft.place ? (
          <Pressable
            onPress={toggleLocation}
            accessibilityRole="button"
            accessibilityLabel="Remove location"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Feather name="map-pin" size={13} color={t.gold} />
            <Ui style={{ color: t.inkSoft }}>{draft.place.placeName}</Ui>
            <Feather name="x" size={12} color={t.inkFaint} />
          </Pressable>
        ) : null}

        <MoodPicker values={draft.moods} onToggle={(m) => { draft.toggleMood(m); scheduleSave(); }} />

        {draft.moods.length > 0 ? (
          <Ui
            onPress={() => router.push({ pathname: '/mood/[mood]', params: { mood: draft.moods[draft.moods.length - 1] } })}
            accessibilityRole="button"
            style={{ color: t.accent, fontFamily: fonts.uiMedium }}
          >
            Scripture for feeling {(MOOD_META[draft.moods[draft.moods.length - 1]]?.label ?? '').toLowerCase()} →
          </Ui>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {draft.tagNames.map((name) => (
            <Ui
              key={name}
              onPress={() => {
                draft.removeTag(name);
                scheduleSave();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Remove tag ${name}`}
              style={{ color: t.inkSoft }}
            >
              #{name} ✕
            </Ui>
          ))}
          <TextInput
            placeholder="add a tag…"
            placeholderTextColor={t.inkFaint}
            value={tagInput}
            onChangeText={changeTagInput}
            onSubmitEditing={commitTag}
            onBlur={commitTag}
            returnKeyType="done"
            blurOnSubmit={false}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ fontFamily: fonts.ui, fontSize: 13.5, color: t.ink, minWidth: 90, paddingVertical: 2 }}
            accessibilityLabel="Add tag"
          />
        </View>
      </ScrollView>
      </View>

      {recording ? (
        <View
          accessibilityLiveRegion="polite"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 8 }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.accent }} />
          <Ui style={{ color: t.inkSoft }}>Recording · {formatDuration(recState.durationMillis)}</Ui>
        </View>
      ) : null}

      {/* quiet action row */}
      <View
        style={{
          flexDirection: 'row', gap: 6, paddingHorizontal: 22, paddingVertical: 8,
          borderTopWidth: 1, borderTopColor: t.hairline, backgroundColor: t.bg,
        }}
      >
        {actionIcon('book', 'Attach scripture', () => router.push('/verse-picker'), draft.verses.length > 0)}
        {actionIcon('image', 'Attach photos', () => void attachPhotos(), draft.photos.length > 0)}
        {actionIcon(
          recording ? 'square' : 'mic',
          recording ? 'Stop recording' : 'Record a voice note',
          () => void (recording ? stopRecording() : startRecording()),
          recording || draft.voices.length > 0,
        )}
        {actionIcon(
          'map-pin',
          locating ? 'Finding your place…' : draft.place ? 'Remove location' : 'Note location',
          () => void toggleLocation(),
          draft.place != null,
        )}
        {actionIcon('book-open', 'Prompt library', () => router.push('/prompts'))}
        {locating ? (
          <View style={{ justifyContent: 'center' }}>
            <Ui style={{ color: t.inkFaint }}>finding where you are…</Ui>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
