import type { Sql } from '../db/sql';

/**
 * Non-sensitive preferences only, lock/PIN/key material lives in
 * SecureStore (see lib/lock, lib/crypto/keys), never in this table.
 */
export type SettingKey =
  | 'reminder_time' // "HH:MM" local, or "off"
  | 'default_translation'
  | 'theme' // "system" | "dawn" | "vigil"
  | 'font_scale'
  | 'weekly_goal' // gentle target: days per week to journal ("0" = off)
  | 'location_enabled' // remember the last choice of the composer's location toggle
  | 'widget_kind' // which content the home/lock widget shows (WidgetKind)
  | 'widget_note' // the "note to yourself" text
  | 'widget_verse' // encoded VerseRef the user pinned to their widget
  | 'widget_payload'; // last published payload JSON (also read by the Android widget task)

export async function getSetting(db: Sql, key: SettingKey): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(`SELECT value FROM settings WHERE key = ?`, [key]);
  return row?.value ?? null;
}

export async function setSetting(db: Sql, key: SettingKey, value: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}
