import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { IconButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Overline, Serif, Ui } from '../components/Typ';
import { useDb } from '../db/DbProvider';
import {
  downloadTranslation, downloadUrl, isTranslationInstalled, removeTranslation,
} from '../lib/scripture/downloads';
import { formatBytes, TRANSLATIONS, type Translation } from '../lib/scripture/translations';
import { getActiveTranslationId, setActiveTranslationId } from '../repo/translations';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';

/** Choose the Bible version, and download versions to read offline. */
export default function Versions() {
  const t = useTheme();
  const { journal, scriptureId, refreshScripture } = useDb();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: activeId, refetch } = useQuery({
    queryKey: ['activeTranslation'],
    queryFn: () => getActiveTranslationId(journal),
  });

  const choose = async (tr: Translation) => {
    if (!isTranslationInstalled(tr.id)) return;
    await setActiveTranslationId(journal, tr.id);
    await refreshScripture();
    await refetch();
    await queryClient.invalidateQueries();
  };

  const download = async (tr: Translation) => {
    setBusy(tr.id);
    try {
      await downloadTranslation(tr.id);
      await setActiveTranslationId(journal, tr.id);
      await refreshScripture();
      await refetch();
      await queryClient.invalidateQueries();
    } catch (e) {
      Alert.alert('Could not download', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = (tr: Translation) =>
    Alert.alert(`Remove ${tr.abbrev}?`, 'You can download it again later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          removeTranslation(tr.id);
          if (activeId === tr.id) await setActiveTranslationId(journal, 'WEB');
          await refreshScripture();
          await refetch();
          await queryClient.invalidateQueries();
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title="Bible version"
        left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} size={24} />}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60, gap: 10 }}>
        <Ui style={{ color: t.inkFaint, paddingBottom: 4 }}>
          One version ships with the app so scripture works offline right away. Download others to read them offline too.
        </Ui>

        {TRANSLATIONS.map((tr) => {
          const installed = isTranslationInstalled(tr.id);
          const effective = scriptureId === tr.id;
          const chosen = activeId === tr.id;
          const canDownload = downloadUrl(tr.id) != null;
          const loading = busy === tr.id;

          return (
            <Pressable
              key={tr.id}
              onPress={() => (installed ? void choose(tr) : canDownload ? void download(tr) : undefined)}
              accessibilityRole="button"
              accessibilityState={{ selected: chosen }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14,
                borderWidth: 1, borderColor: chosen ? t.accent : t.hairline,
                backgroundColor: chosen ? t.accentSoft : t.surface,
              }}
            >
              <View
                style={{
                  width: 20, height: 20, borderRadius: 10, borderWidth: 2,
                  borderColor: chosen ? t.accent : t.inkFaint,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                {chosen ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: t.accent }} /> : null}
              </View>

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Serif style={{ fontSize: 16, color: t.ink }}>{tr.abbrev}</Serif>
                  <Ui style={{ color: t.inkFaint, flexShrink: 1 }} numberOfLines={1}>{tr.name}</Ui>
                </View>
                <Ui style={{ color: t.inkFaint, fontSize: 12 }}>
                  {tr.license}
                  {tr.bundled ? ' · included' : installed ? ' · downloaded' : ` · ${formatBytes(tr.approxBytes)}`}
                  {chosen && !effective ? ' · using included version until downloaded' : ''}
                </Ui>
              </View>

              {loading ? (
                <ActivityIndicator color={t.accent} />
              ) : tr.bundled ? (
                <Feather name="check-circle" size={18} color={chosen ? t.accent : t.inkFaint} />
              ) : installed ? (
                <Pressable onPress={() => remove(tr)} accessibilityRole="button" accessibilityLabel={`Remove ${tr.abbrev}`} hitSlop={8}>
                  <Feather name="trash-2" size={17} color={t.inkFaint} />
                </Pressable>
              ) : canDownload ? (
                <Feather name="download" size={18} color={t.accent} />
              ) : (
                <Feather name="lock" size={16} color={t.inkFaint} />
              )}
            </Pressable>
          );
        })}

        <View style={{ backgroundColor: t.surfaceAlt, borderRadius: 12, padding: 14, marginTop: 10, gap: 4 }}>
          <Serif style={{ fontSize: 14.5, color: t.ink }}>About versions</Serif>
          <Ui style={{ color: t.inkFaint }}>
            Public-domain versions can be downloaded freely. Copyrighted versions like NKJV need a licensed source; a
            lock means no download is available yet. Your choice is remembered, and Selah reads the included version
            until your version is downloaded.
          </Ui>
        </View>
      </ScrollView>
    </View>
  );
}
