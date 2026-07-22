import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { IconButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Overline } from '../components/Typ';
import { useDb } from '../db/DbProvider';
import { dayKey, monthGrid } from '../lib/insights';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';

const CELL = 44;
const MONTH_HEIGHT = 8 + 22 + 10 + 6 * CELL + 26; // overline + weeks + padding

interface MonthItem {
  year: number;
  month0: number;
}

export default function Calendar() {
  const t = useTheme();
  const { journal } = useDb();
  const today = dayKey(Date.now());

  const { data: journaled } = useQuery({
    queryKey: ['journaledDays'],
    queryFn: async () => {
      const rows = await journal.getAllAsync<{ created_at: number }>(
        `SELECT created_at FROM entries WHERE is_archived = 0 AND deleted_at IS NULL`,
      );
      return new Set(rows.map((r) => dayKey(r.created_at)));
    },
  });

  const { data: firstTs } = useQuery({
    queryKey: ['firstEntryTs'],
    queryFn: async () => {
      const row = await journal.getFirstAsync<{ m: number }>(`SELECT MIN(created_at) AS m FROM entries`);
      return row?.m ?? null;
    },
  });

  const months = useMemo<MonthItem[]>(() => {
    const now = new Date();
    const start = firstTs ? new Date(firstTs) : now;
    // at least a year of months, extended back to the first entry
    const earliest = new Date(Math.min(start.getFullYear(), now.getFullYear() - 1), start.getFullYear() < now.getFullYear() - 1 ? start.getMonth() : now.getMonth(), 1);
    const out: MonthItem[] = [];
    const cursor = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
    while (cursor.getFullYear() < now.getFullYear() || (cursor.getFullYear() === now.getFullYear() && cursor.getMonth() <= now.getMonth())) {
      out.push({ year: cursor.getFullYear(), month0: cursor.getMonth() });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }, [firstTs]);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title="Calendar"
        left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} size={24} />}
      />
      <View style={{ flexDirection: 'row', paddingHorizontal: 28, paddingBottom: 6, gap: 0 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <Text
            key={i}
            style={{
              width: CELL, textAlign: 'center', fontFamily: fonts.uiSemi,
              fontSize: 10.5, letterSpacing: 1, color: t.inkFaint,
            }}
          >
            {d}
          </Text>
        ))}
      </View>
      <FlatList
        data={months}
        keyExtractor={(m) => `${m.year}-${m.month0}`}
        initialScrollIndex={Math.max(0, months.length - 1)}
        getItemLayout={(_, index) => ({ length: MONTH_HEIGHT, offset: MONTH_HEIGHT * index, index })}
        contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 28 }}
        renderItem={({ item }) => {
          const weeks = monthGrid(item.year, item.month0);
          return (
            <View style={{ height: MONTH_HEIGHT, paddingTop: 8 }}>
              <Overline style={{ paddingBottom: 10 }}>
                {format(new Date(item.year, item.month0, 1), 'MMMM yyyy')}
              </Overline>
              {weeks.map((week, wi) => (
                <View key={wi} style={{ flexDirection: 'row' }}>
                  {week.map((cell) => {
                    const has = cell.inMonth && (journaled?.has(cell.key) ?? false);
                    const isToday = cell.key === today;
                    const future = cell.key > today;
                    return (
                      <Pressable
                        key={cell.key}
                        disabled={!has}
                        onPress={() => router.push({ pathname: '/day/[date]', params: { date: cell.key } })}
                        accessibilityRole={has ? 'button' : undefined}
                        accessibilityLabel={has ? `Entries on ${cell.key}` : undefined}
                        style={{ width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' }}
                      >
                        {cell.inMonth ? (
                          <View style={{ alignItems: 'center', gap: 3 }}>
                            <View
                              style={{
                                width: 30, height: 30, borderRadius: 15,
                                alignItems: 'center', justifyContent: 'center',
                                backgroundColor: has ? t.accentSoft : 'transparent',
                                borderWidth: isToday ? 1 : 0,
                                borderColor: t.accent,
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: has ? fonts.uiSemi : fonts.ui,
                                  fontSize: 13.5,
                                  color: future ? t.inkFaint : has ? t.accent : t.inkSoft,
                                }}
                              >
                                {cell.day}
                              </Text>
                            </View>
                            <View
                              style={{
                                width: 4, height: 4, borderRadius: 2,
                                backgroundColor: has ? t.accent : 'transparent',
                              }}
                            />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          );
        }}
      />
    </View>
  );
}
