import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { IconButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Overline, Serif, Ui } from '../components/Typ';
import { VerseChip } from '../components/VerseChip';
import { WidgetPreview } from '../components/WidgetPreview';
import { useDb } from '../db/DbProvider';
import { decodeVerseParam } from '../lib/routeParams';
import { WIDGET_KINDS, type WidgetKind } from '../lib/widget/payload';
import { widgetsSupported } from '../lib/widgetBridge';
import { assembleWidgetPayload, getWidgetConfig, refreshWidget, saveWidgetConfig } from '../repo/widget';
import { useDraftStore } from '../state/draftStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';

/**
 * "Home & Lock Screen", choose what Selah leaves you where you'll see it.
 * The preview updates live; changes publish to the real widgets on save.
 */
export default function WidgetSettings() {
  const t = useTheme();
  const { journal, scripture } = useDb();
  const queryClient = useQueryClient();

  const [kind, setKind] = useState<WidgetKind>('dailyVerse');
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false);

  // pull a verse the composer's picker may have handed back via the draft store
  const pickedVerse = useDraftStore((s) => s.verses[0]?.ref ?? null);

  useEffect(() => {
    void getWidgetConfig(journal).then((cfg) => {
      setKind(cfg.kind);
      setNote(cfg.note);
      setLoaded(true);
    });
  }, [journal]);

  // whenever the picker returns with a verse, adopt it as the pinned verse
  useEffect(() => {
    if (pickedVerse) {
      void saveWidgetConfig(journal, { verse: pickedVerse, kind: 'pinnedVerse' });
      setKind('pinnedVerse');
      useDraftStore.getState().clear();
    }
  }, [pickedVerse, journal]);

  const { data: config } = useQuery({
    queryKey: ['widgetConfig'],
    queryFn: () => getWidgetConfig(journal),
  });

  const { data: preview } = useQuery({
    queryKey: ['widgetPreview', kind, note, config?.verse],
    queryFn: async () => {
      await saveWidgetConfig(journal, { kind, note });
      return assembleWidgetPayload(journal, scripture, Date.now());
    },
    enabled: loaded,
  });

  const pinnedRef = useMemo(
    () => config?.verse ?? decodeVerseParam(undefined),
    [config?.verse],
  );

  const save = async () => {
    await saveWidgetConfig(journal, { kind, note });
    await refreshWidget(journal, scripture, Date.now());
    await queryClient.invalidateQueries();
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title="Home & Lock Screen"
        left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} size={24} />}
        right={<IconButton name="check" label="Save" onPress={save} size={24} color={t.accent} />}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 60, gap: 26 }}>
        <Ui style={{ color: t.inkFaint }}>
          Choose one thing to keep in view. Add the Selah widget from your home screen or, on iPhone, your lock screen.
        </Ui>

        {preview ? <WidgetPreview payload={preview} /> : null}

        <View style={{ gap: 12 }}>
          <Overline>Show</Overline>
          {WIDGET_KINDS.map(({ kind: k, label, blurb }) => {
            const active = kind === k;
            return (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: active ? t.accent : t.hairline,
                  backgroundColor: active ? t.accentSoft : 'transparent',
                }}
              >
                <View
                  style={{
                    width: 18, height: 18, borderRadius: 9,
                    borderWidth: 2, borderColor: active ? t.accent : t.inkFaint,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {active ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.accent }} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Serif style={{ fontSize: 15.5, color: t.ink }}>{label}</Serif>
                  <Ui style={{ color: t.inkFaint }}>{blurb}</Ui>
                </View>
              </Pressable>
            );
          })}
        </View>

        {kind === 'note' ? (
          <View style={{ gap: 8 }}>
            <Overline>Your note</Overline>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Leave yourself a word…"
              placeholderTextColor={t.inkFaint}
              multiline
              maxLength={240}
              style={{
                fontFamily: fonts.serif, fontSize: 16, lineHeight: 25, color: t.ink,
                borderWidth: 1, borderColor: t.hairline, borderRadius: 12,
                padding: 14, minHeight: 96, backgroundColor: t.surface,
              }}
              accessibilityLabel="Widget note"
            />
            <Ui style={{ color: t.inkFaint, textAlign: 'right' }}>{note.length}/240</Ui>
          </View>
        ) : null}

        {kind === 'pinnedVerse' ? (
          <View style={{ gap: 10 }}>
            <Overline>The verse to keep</Overline>
            {pinnedRef ? (
              <View style={{ flexDirection: 'row' }}>
                <VerseChip refv={pinnedRef} onPress={() => router.push('/verse-picker')} />
              </View>
            ) : null}
            <Ui
              onPress={() => router.push('/verse-picker')}
              accessibilityRole="button"
              style={{ color: t.accent, fontFamily: fonts.uiMedium }}
            >
              {pinnedRef ? 'Choose a different verse' : '＋ Choose a verse'}
            </Ui>
          </View>
        ) : null}

        {!widgetsSupported() ? (
          <View style={{ backgroundColor: t.surfaceAlt, borderRadius: 12, padding: 14, gap: 4 }}>
            <Serif style={{ fontSize: 14.5, color: t.ink }}>Preview only in Expo Go</Serif>
            <Ui style={{ color: t.inkFaint }}>
              Live widgets appear once Selah is installed as a real app (a development or store build). Your choice is saved and will take effect there.
            </Ui>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
