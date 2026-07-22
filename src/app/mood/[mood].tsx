import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { IconButton } from '../../components/IconButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Serif, Ui } from '../../components/Typ';
import { VerseCard } from '../../components/VerseCard';
import { encodeVerseParam } from '../../lib/routeParams';
import { versesForMood } from '../../lib/scripture/moodVerses';
import { useTheme } from '../../theme/ThemeContext';
import { fonts, MOOD_META } from '../../theme/tokens';

const INTROS: Record<string, string> = {
  still: 'Be quiet a moment. Let these settle.',
  grateful: 'Name the gifts. Here is language for thanks.',
  hopeful: 'Hope is not wishful; it is anchored. Read slowly.',
  rejoicing: 'Let your joy have somewhere to land.',
  peaceful: 'Guard this peace. These verses keep it.',
  content: 'Enough is a gift. Sit with it here.',
  anxious: 'Bring the worry here before it grows. You are held.',
  afraid: 'Fear shrinks in the light of these words.',
  weary: 'Come and rest. You were not made to carry it all.',
  lonely: 'You are not as alone as it feels. Read gently.',
  heavy: 'Grief is welcome here. So is comfort.',
  discouraged: 'Lift your eyes for a moment. Begin again.',
  wrestling: 'Doubt is allowed to pray. So did these.',
  angry: 'Be angry, and bring it honestly. Here is wisdom.',
  tempted: 'You have a way out, and you are not alone in it.',
};

/** Scripture curated for a feeling, read, or start a reflection from one. */
export default function MoodVerses() {
  const t = useTheme();
  const { mood } = useLocalSearchParams<{ mood: string }>();
  const meta = mood ? MOOD_META[mood] : undefined;
  const refs = mood ? versesForMood(mood) : [];

  if (!meta || refs.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <ScreenHeader left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} />} />
        <EmptyState title="No verses for this mood yet." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} size={24} />}
        title={`When you feel ${meta.label.toLowerCase()}`}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 60, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: meta.dot }} />
          <Serif style={{ fontFamily: fonts.serifItalic, fontSize: 15.5, color: t.inkSoft, flex: 1 }}>
            {INTROS[mood!] ?? 'Read slowly. Let one line stay with you.'}
          </Serif>
        </View>

        {refs.map((ref, i) => (
          <View key={i} style={{ gap: 8 }}>
            <VerseCard
              refv={ref}
              onPressRef={() => router.push({ pathname: '/read', params: { book: String(ref.book), chapter: String(ref.chapter) } })}
            />
            <Pressable
              onPress={() => router.push({ pathname: '/compose', params: { v: encodeVerseParam(ref) } })}
              accessibilityRole="button"
              style={{ alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2 }}
            >
              <Text style={{ fontFamily: fonts.uiSemi, fontSize: 13, color: t.accent }}>
                Reflect on this →
              </Text>
            </Pressable>
          </View>
        ))}

        <Ui style={{ color: t.inkFaint, textAlign: 'center', paddingTop: 8 }}>
          Tap a reference to read the whole chapter.
        </Ui>
      </ScrollView>
    </View>
  );
}
