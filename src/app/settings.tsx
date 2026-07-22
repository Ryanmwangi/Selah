import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, Switch, Text, View } from 'react-native';
import { IconButton } from '../components/IconButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Overline, Serif, Ui } from '../components/Typ';
import { useDb } from '../db/DbProvider';
import { track } from '../lib/analytics';
import { exportMarkdown } from '../lib/export';
import { cancelReminder, scheduleDailyReminder } from '../lib/reminders';
import { searchEntries } from '../repo/entries';
import { getSetting, setSetting } from '../repo/settings';
import { useAppStore, type ThemePref } from '../state/appStore';
import { useLockStore } from '../state/lockStore';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Overline>{title}</Overline>
      <View
        style={{
          backgroundColor: t.surface, borderRadius: 10, borderWidth: 1,
          borderColor: t.hairline, padding: 14, gap: 14,
        }}
      >
        {children}
      </View>
    </View>
  );
}

/** "HH:MM" → a Date today at that time (for the picker); "off" → 8:00pm default. */
function reminderToDate(value: string): Date {
  const d = new Date();
  if (value === 'off') {
    d.setHours(20, 0, 0, 0);
  } else {
    const [h, m] = value.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  }
  return d;
}

/** "HH:MM" → a friendly "8:00 PM". */
function formatReminder(value: string): string {
  if (value === 'off') return 'Off';
  const [h, m] = value.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function Settings() {
  const t = useTheme();
  const { journal } = useDb();
  const queryClient = useQueryClient();
  const app = useAppStore();
  const lock = useLockStore();
  const [busy, setBusy] = useState(false);
  const [goal, setGoal] = useState('3');
  const [showTimePicker, setShowTimePicker] = useState(false);

  React.useEffect(() => {
    void getSetting(journal, 'weekly_goal').then((g) => g != null && setGoal(g));
  }, [journal]);

  const { data: counts } = useQuery({
    queryKey: ['journalCounts'],
    queryFn: async () => {
      const archived = await journal.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) AS n FROM entries WHERE is_archived = 1 AND deleted_at IS NULL`,
      );
      const deleted = await journal.getFirstAsync<{ n: number }>(
        `SELECT COUNT(*) AS n FROM entries WHERE deleted_at IS NOT NULL`,
      );
      return { archived: archived?.n ?? 0, deleted: deleted?.n ?? 0 };
    },
  });

  const setTheme = (pref: ThemePref) => app.setThemePref(journal, pref);

  const reminderOn = app.reminderTime !== 'off';
  const reminderDate = React.useMemo(() => reminderToDate(app.reminderTime), [app.reminderTime]);

  const chooseTime = async (hour: number, minute: number) => {
    const ok = await scheduleDailyReminder(hour, minute);
    if (!ok) {
      Alert.alert('Notifications are off', 'Allow notifications for Selah in system settings to get a daily nudge.');
      return;
    }
    const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    app.setReminderTime(journal, time);
    track('reminder_set');
  };

  const toggleReminder = async (value: boolean) => {
    if (!value) {
      await cancelReminder();
      app.setReminderTime(journal, 'off');
      return;
    }
    // default a fresh reminder to a calm 8:00pm, then let them fine-tune
    await chooseTime(20, 0);
    setShowTimePicker(true);
  };

  const toggleLock = async (value: boolean) => {
    if (value) {
      router.push('/pin-setup');
    } else {
      Alert.alert('Turn off app lock?', 'Anyone with your phone will be able to open your journal.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Turn off', style: 'destructive', onPress: () => void lock.disable() },
      ]);
    }
  };

  const doExport = async () => {
    setBusy(true);
    try {
      const entries = await searchEntries(journal, { includeArchived: true }, 10_000);
      const md = exportMarkdown(entries, new Date());
      track('export_created');
      await Share.share({ message: md, title: 'Selah journal export' });
    } finally {
      setBusy(false);
    }
  };

  const themeChip = (pref: ThemePref, label: string) => (
    <Pressable
      key={pref}
      onPress={() => setTheme(pref)}
      accessibilityRole="button"
      accessibilityState={{ selected: app.themePref === pref }}
      style={{
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1,
        borderColor: app.themePref === pref ? t.accent : t.hairline,
        backgroundColor: app.themePref === pref ? t.accentSoft : 'transparent',
      }}
    >
      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, color: app.themePref === pref ? t.accent : t.inkSoft }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScreenHeader
        title="Settings"
        left={<IconButton name="chevron-left" label="Back" onPress={() => router.back()} size={24} />}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 60 }}>
        <Section title="Appearance">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {themeChip('system', 'System')}
            {themeChip('dawn', 'Dawn')}
            {themeChip('vigil', 'Vigil')}
          </View>
        </Section>

        <Section title="Home & lock screen">
          <Pressable
            onPress={() => router.push('/widget')}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Serif style={{ fontSize: 15 }}>Widgets</Serif>
              <Ui style={{ color: t.inkFaint }}>
                Leave yourself a verse, a note, or your rhythm where you’ll see it.
              </Ui>
            </View>
            <Ui style={{ color: t.inkFaint }}>›</Ui>
          </Pressable>
        </Section>

        <Section title="Daily reflection">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Serif style={{ fontSize: 15 }}>Daily prompt</Serif>
              <Ui style={{ color: t.inkFaint }}>
                {reminderOn ? `Selah nudges you at ${formatReminder(app.reminderTime)}.` : 'A gentle nudge to pause.'}
              </Ui>
            </View>
            <Switch
              value={reminderOn}
              onValueChange={toggleReminder}
              trackColor={{ true: t.accent, false: t.hairline }}
              accessibilityLabel="Daily reflection reminder"
            />
          </View>

          {reminderOn ? (
            <Pressable
              onPress={() => setShowTimePicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Choose reminder time"
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                borderTopWidth: 1, borderTopColor: t.hairline, paddingTop: 12,
              }}
            >
              <Ui style={{ color: t.inkSoft }}>Time</Ui>
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  backgroundColor: t.accentSoft, borderRadius: 10,
                  paddingHorizontal: 14, paddingVertical: 8,
                }}
              >
                <Feather name="clock" size={14} color={t.accent} />
                <Text style={{ fontFamily: fonts.uiSemi, fontSize: 15, color: t.accent }}>
                  {formatReminder(app.reminderTime)}
                </Text>
              </View>
            </Pressable>
          ) : null}

          <Ui style={{ color: t.inkFaint }}>A quiet local notification. Nothing leaves your phone.</Ui>

          {showTimePicker ? (
            <DateTimePicker
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
              value={reminderDate}
              onChange={(event, date) => {
                // Android fires 'dismissed' on cancel; iOS updates continuously
                if (Platform.OS !== 'ios') setShowTimePicker(false);
                if (event.type === 'dismissed' || !date) return;
                void chooseTime(date.getHours(), date.getMinutes());
              }}
            />
          ) : null}
          {showTimePicker && Platform.OS === 'ios' ? (
            <Pressable
              onPress={() => setShowTimePicker(false)}
              accessibilityRole="button"
              style={{ alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 10 }}
            >
              <Text style={{ fontFamily: fonts.uiSemi, fontSize: 14, color: t.accent }}>Done</Text>
            </Pressable>
          ) : null}
        </Section>

        <Section title="Gentle weekly goal">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['0', '2', '3', '5', '7'] as const).map((g) => (
              <Pressable
                key={g}
                onPress={() => {
                  setGoal(g);
                  void setSetting(journal, 'weekly_goal', g);
                }}
                accessibilityRole="button"
                style={{
                  paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1,
                  borderColor: goal === g ? t.accent : t.hairline,
                  backgroundColor: goal === g ? t.accentSoft : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.uiMedium, fontSize: 13,
                    color: goal === g ? t.accent : t.inkSoft,
                  }}
                >
                  {g === '0' ? 'Off' : `${g} days`}
                </Text>
              </Pressable>
            ))}
          </View>
          <Ui style={{ color: t.inkFaint }}>
            A quiet rhythm to aim for, shown in Insights and never nagged about.
          </Ui>
        </Section>

        <Section title="Privacy & security">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Serif style={{ fontSize: 15 }}>App lock</Serif>
              <Ui style={{ color: t.inkFaint }}>
                Face ID / fingerprint with a PIN fallback. Locks when Selah leaves the foreground.
              </Ui>
            </View>
            <Switch
              value={lock.enabled}
              onValueChange={toggleLock}
              trackColor={{ true: t.accent, false: t.hairline }}
              accessibilityLabel="App lock"
            />
          </View>
          <Ui style={{ color: t.inkFaint }}>
            Your journal lives only on this device. No account, no cloud, no analytics on your words.
          </Ui>
        </Section>

        <Section title="Your journal">
          <Pressable
            onPress={() => router.push('/archived')}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Serif style={{ fontSize: 15 }}>Archived entries</Serif>
              <Ui style={{ color: t.inkFaint }}>Set aside from the timeline, kept forever.</Ui>
            </View>
            <Ui style={{ color: t.inkFaint }}>{counts?.archived ?? 0}  ›</Ui>
          </Pressable>
          <Pressable
            onPress={() => router.push('/trash')}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Serif style={{ fontSize: 15 }}>Recently deleted</Serif>
              <Ui style={{ color: t.inkFaint }}>Recoverable for 7 days, then gone for good.</Ui>
            </View>
            <Ui style={{ color: t.inkFaint }}>{counts?.deleted ?? 0}  ›</Ui>
          </Pressable>
        </Section>

        <Section title="Your words are yours">
          <Pressable onPress={doExport} disabled={busy} accessibilityRole="button">
            <Serif style={{ fontSize: 15, color: t.accent }}>
              {busy ? 'Preparing…' : 'Export journal as Markdown'}
            </Serif>
          </Pressable>
          <Ui style={{ color: t.inkFaint }}>
            Every entry, verse reference, tag and mood, in plain text you can keep anywhere.
          </Ui>
        </Section>

        <Section title="About">
          <Serif style={{ fontSize: 15 }}>
            Selah: a Hebrew word in the Psalms, often read as “pause, and reflect.”
          </Serif>
          <Ui style={{ color: t.inkFaint }}>
            Scripture: World English Bible (public domain). v1.0.0
          </Ui>
        </Section>
      </ScrollView>
    </View>
  );
}
