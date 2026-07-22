import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { IconButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Overline, Serif, Ui } from '../components/Typ';
import { useDb } from '../db/DbProvider';
import { loadInsights } from '../repo/insights';
import { getSetting } from '../repo/settings';
import { useTheme } from '../theme/ThemeContext';
import { fonts, MOOD_META } from '../theme/tokens';

function Big({ value, label }: { value: string | number; label: string }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 46, color: t.ink }}>
        {value}
      </Text>
      <Ui style={{ color: t.inkFaint, fontSize: 12.5 }}>{label}</Ui>
    </View>
  );
}

export default function Insights() {
  const t = useTheme();
  const { journal } = useDb();

  const { data } = useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      const goalRaw = await getSetting(journal, 'weekly_goal');
      const goal = goalRaw == null ? 3 : parseInt(goalRaw, 10) || 0;
      return loadInsights(journal, Date.now(), goal);
    },
  });

  if (!data) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const maxMood = Math.max(1, ...data.moodCounts.map(([, n]) => n));
  const since = data.firstEntryAt ? format(new Date(data.firstEntryAt), 'MMMM yyyy') : null;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title="Insights"
        left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} size={24} />}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingTop: 12, paddingBottom: 80, gap: 40 }}>
        {since ? <Overline>Journaling since {since}</Overline> : null}

        <View style={{ flexDirection: 'row', gap: 20 }}>
          <Big value={data.daysJournaled} label="days journaled" />
          <Big value={data.streaks.current} label="day streak" />
          <Big value={data.streaks.longest} label="longest streak" />
        </View>

        {data.week.goal > 0 ? (
          <View style={{ gap: 12 }}>
            <Overline>This week</Overline>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    width: 26,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i < data.week.done ? t.accent : t.surfaceAlt,
                  }}
                />
              ))}
            </View>
            <Ui style={{ color: t.inkSoft }}>
              {data.week.done >= data.week.goal
                ? `Your gentle goal of ${data.week.goal} days is met. Well paused.`
                : `${data.week.done} of a gentle ${data.week.goal}-day goal. No pressure, just presence.`}
            </Ui>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 20 }}>
          <Big value={data.totalEntries} label="entries" />
          <Big value={data.totalWords.toLocaleString()} label="words written" />
          <Big value={data.photoCount} label="photos kept" />
        </View>

        {data.moodCounts.length > 0 ? (
          <View style={{ gap: 14 }}>
            <Overline>How your seasons have felt</Overline>
            {data.moodCounts.map(([mood, n]) => {
              const meta = MOOD_META[mood];
              if (!meta) return null;
              return (
                <View key={mood} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Ui style={{ width: 76, color: t.inkSoft }}>{meta.label}</Ui>
                  <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: t.surfaceAlt }}>
                    <View
                      style={{
                        width: `${Math.round((n / maxMood) * 100)}%`,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: meta.dot,
                      }}
                    />
                  </View>
                  <Ui style={{ width: 28, textAlign: 'right', color: t.inkFaint }}>{n}</Ui>
                </View>
              );
            })}
          </View>
        ) : null}

        {data.topBooks.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Overline>Where you keep returning</Overline>
            {data.topBooks.map(([book, n]) => (
              <Serif key={book} style={{ fontSize: 16, color: t.ink }}>
                {book}
                <Ui style={{ color: t.inkFaint }}>{'  '}· {n} {n === 1 ? 'reflection' : 'reflections'}</Ui>
              </Serif>
            ))}
          </View>
        ) : null}

        {data.topTags.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Overline>Recurring threads</Overline>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {data.topTags.map(([tag, n]) => (
                <Ui key={tag} style={{ color: t.inkSoft }}>
                  #{tag} <Ui style={{ color: t.inkFaint }}>{n}</Ui>
                </Ui>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
