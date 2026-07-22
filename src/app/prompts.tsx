import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { IconButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Overline, Serif } from '../components/Typ';
import { useDb } from '../db/DbProvider';
import { track } from '../lib/analytics';
import { listPrompts } from '../repo/prompts';
import type { Prompt } from '../repo/types';
import { useDraftStore } from '../state/draftStore';
import { useTheme } from '../theme/ThemeContext';

/** The prompt library, for the days the page stays blank. */
export default function Prompts() {
  const t = useTheme();
  const { journal } = useDb();
  const [shuffled, setShuffled] = useState<Prompt[] | null>(null);

  const { data: prompts } = useQuery({ queryKey: ['prompts'], queryFn: () => listPrompts(journal) });

  const data = shuffled ?? prompts ?? [];
  let lastCategory = '';

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title="Prompts"
        left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} size={24} />}
        right={
          <IconButton
            name="shuffle"
            label="Shuffle prompts"
            onPress={() => {
              const arr = [...(prompts ?? [])];
              for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
              }
              setShuffled(arr);
            }}
          />
        }
      />
      <FlatList
        data={data}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingBottom: 60 }}
        renderItem={({ item }) => {
          const showHeader = !shuffled && item.category !== lastCategory;
          if (!shuffled) lastCategory = item.category;
          return (
            <>
              {showHeader ? (
                <Overline style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 6 }}>
                  {item.category}
                </Overline>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  track('prompt_started');
                  const draft = useDraftStore.getState();
                  if (draft.entryId || draft.dirty) {
                    // composing already, weave the prompt into the open entry
                    draft.patch({ body: draft.body ? `${draft.body.trimEnd()}\n\n> ${item.text}\n\n` : `> ${item.text}\n\n` });
                    router.back();
                  } else {
                    router.push({ pathname: '/compose', params: { promptId: item.id } });
                  }
                }}
                style={({ pressed }) => ({
                  marginHorizontal: 16,
                  marginVertical: 5,
                  padding: 14,
                  borderRadius: 10,
                  backgroundColor: pressed ? t.surfaceAlt : t.surface,
                  borderWidth: 1,
                  borderColor: t.hairline,
                })}
              >
                <Serif style={{ fontSize: 15.5, lineHeight: 24 }}>{item.text}</Serif>
              </Pressable>
            </>
          );
        }}
      />
    </View>
  );
}
