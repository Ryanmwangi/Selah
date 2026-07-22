/**
 * App-wide preferences, hydrated from the settings table at boot.
 * Setters persist back to SQLite fire-and-forget.
 */
import { create } from 'zustand';
import type { Sql } from '../db/sql';
import { getSetting, setSetting } from '../repo/settings';

export type ThemePref = 'system' | 'dawn' | 'vigil';

interface AppState {
  hydrated: boolean;
  themePref: ThemePref;
  reminderTime: string; // "HH:MM" or "off"
  hydrate(db: Sql): Promise<void>;
  setThemePref(db: Sql, pref: ThemePref): void;
  setReminderTime(db: Sql, time: string): void;
}

export const useAppStore = create<AppState>((set) => ({
  hydrated: false,
  themePref: 'system',
  reminderTime: 'off',
  async hydrate(db) {
    const [theme, reminder] = await Promise.all([
      getSetting(db, 'theme'),
      getSetting(db, 'reminder_time'),
    ]);
    set({
      hydrated: true,
      themePref: (theme as ThemePref) ?? 'system',
      reminderTime: reminder ?? 'off',
    });
  },
  setThemePref(db, pref) {
    set({ themePref: pref });
    void setSetting(db, 'theme', pref);
  },
  setReminderTime(db, time) {
    set({ reminderTime: time });
    void setSetting(db, 'reminder_time', time);
  },
}));
