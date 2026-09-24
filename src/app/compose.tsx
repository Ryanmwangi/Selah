import { Feather } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { IconButton } from '../components/IconButton';
import { VoiceNote } from '../components/VoiceNote';
import { MoodPicker } from '../components/MoodPicker';
import { ScreenHeader } from '../components/ScreenHeader';
import { Overline, Ui } from '../components/Typ';
import { VerseChip } from '../components/VerseChip';
import { useDb } from '../db/DbProvider';
import { track } from '../lib/analytics';
import { newId } from '../lib/ids';
import { dayKey } from '../lib/insights';
import { captureCurrentPlace } from '../lib/location';
import { deletePhotoFile, photoUri, pickPhotos } from '../lib/photos';
import { formatDuration, storeRecording } from '../lib/voice';
import { decodeVerseParams } from '../lib/routeParams';
import { addAttachment, removeAttachment } from '../repo/attachments';
import { createEntry, deleteEntry, getEntryWithMeta, setEntryMoods, updateEntry } from '../repo/entries';
import { listPrompts, pickDailyPrompt } from '../repo/prompts';
import { ensureTag, setEntryTags } from '../repo/tags';
import { refreshWidget } from '../repo/widget';
import { linkToRef, setEntryVerseLinks } from '../repo/verseLinks';
import { useDraftStore } from '../state/draftStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts, MOOD_META } from '../theme/tokens';

const AUTOSAVE_MS = 700;

export default function Compose() {
  const t = useTheme();
  const { journal, scripture } = useDb();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ id?: string; v?: string; promptId?: string }>();
  const draft = useDraftStore();
  const [loaded, setLoaded] = useState(false);
  const [placeholder, setPlaceholder] = useState('Pause. What is stirring?');
  const [locating, setLocating] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef<TextInput>(null);

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
            body: existing.body,
            moods: existing.moods,
            verses: existing.verseLinks.map((l) => ({ key: l.id, ref: linkToRef(l) })),
            tagNames: existing.tags.map((tag) => tag.name),
            photos: existing.attachments.filter((a) => a.type !== 'audio').map((a) => ({
              id: a.id, filename: a.filename, width: a.width, height: a.height, saved: true,
            })),
            voices: existing.attachments.filter((a) => a.type === 'audio').map((a) => ({
              id: a.id, filename: a.filename, durationMs: a.duration_ms ?? 0, saved: true,
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
        // daily prompt as a whisper in the placeholder, not a block on the page
        const prompts = await listPrompts(journal);
        const daily = pickDailyPrompt(prompts.filter((p) => p.category !== 'scripture'), dayKey(Date.now()));
        if (!cancelled && daily && !body) setPlaceholder(daily.text);
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
        id: v.id, entryId: id, filename: v.filename, type: 'audio', durationMs: v.durationMs, createdAt: now,
      });
      v.saved = true;
    }
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
      setRecording(true);
    } catch {
      Alert.alert('Could not record', 'Something went wrong starting the recording.');
    }
  };

  const stopRecording = async () => {
    setRecording(false);
    try {
      const ms = recorder.getStatus().durationMillis || recState.durationMillis;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const voice = storeRecording(recorder.uri, ms);
      if (voice) {
        useDraftStore.getState().addVoice({ ...voice, saved: false });
        scheduleSave();
      }
    } catch {
      Alert.alert('Could not save', 'The recording could not be saved.');
    }
  };

  // a recording in progress when leaving the screen is discarded, not half-saved
  useEffect(
    () => () => {
      if (recorder.isRecording) void recorder.stop().catch(() => {});
    },
    [recorder],
  );

  const removeVoice = async (id: string, filename: string, saved: boolean) => {
    useDraftStore.getState().removeVoice(id);
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
      <ScrollView
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

        <TextInput
          ref={bodyRef}
          placeholder={placeholder}
          placeholderTextColor={t.inkFaint}
          value={draft.body}
          onChangeText={(v) => {
            draft.patch({ body: v });
            scheduleSave();
          }}
          multiline
          autoFocus={!params.id}
          textAlignVertical="top"
          style={{
            fontFamily: fonts.serif, fontSize: 17, lineHeight: 28,
            color: t.ink, minHeight: 200,
          }}
          accessibilityLabel="Entry body"
        />

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

        {draft.voices.map((v) => (
          <VoiceNote
            key={v.id}
            filename={v.filename}
            durationMs={v.durationMs}
            onRemove={() => void removeVoice(v.id, v.filename, v.saved)}
          />
        ))}

        {recording ? (
          <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.accent }} />
            <Ui style={{ color: t.inkSoft }}>Recording · {formatDuration(recState.durationMillis)}</Ui>
          </View>
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
            onChangeText={setTagInput}
            onSubmitEditing={() => {
              if (tagInput.trim()) {
                draft.addTag(tagInput);
                setTagInput('');
                scheduleSave();
              }
            }}
            autoCapitalize="none"
            style={{ fontFamily: fonts.ui, fontSize: 13.5, color: t.ink, minWidth: 90, paddingVertical: 2 }}
            accessibilityLabel="Add tag"
          />
        </View>
      </ScrollView>

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
