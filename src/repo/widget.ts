import type { Sql } from '../db/sql';
import { computeStreaks, dayKey } from '../lib/insights';
import { decodeVerseParam } from '../lib/routeParams';
import { formatRef, type VerseRef } from '../lib/scripture/refs';
import { buildWidgetPayload, serializeWidgetPayload, type WidgetKind, type WidgetPayload } from '../lib/widget/payload';
import { publishWidget } from '../lib/widgetBridge';
import { getPassage, pickDailyVerse } from './scripture';
import { getSetting, setSetting } from './settings';

export interface WidgetConfig {
  kind: WidgetKind;
  note: string;
  verse: VerseRef | null;
}

export async function getWidgetConfig(db: Sql): Promise<WidgetConfig> {
  const [kind, note, verse] = await Promise.all([
    getSetting(db, 'widget_kind'),
    getSetting(db, 'widget_note'),
    getSetting(db, 'widget_verse'),
  ]);
  return {
    kind: (kind as WidgetKind) ?? 'dailyVerse',
    note: note ?? '',
    verse: decodeVerseParam(verse ?? undefined),
  };
}

export async function saveWidgetConfig(db: Sql, cfg: Partial<WidgetConfig>): Promise<void> {
  if (cfg.kind !== undefined) await setSetting(db, 'widget_kind', cfg.kind);
  if (cfg.note !== undefined) await setSetting(db, 'widget_note', cfg.note);
  if (cfg.verse !== undefined) {
    await setSetting(db, 'widget_verse', cfg.verse ? encodeVerse(cfg.verse) : '');
  }
}

function encodeVerse(ref: VerseRef): string {
  return [ref.book, ref.chapter, ref.verseStart ?? '', ref.verseEnd ?? ''].join('.');
}

/**
 * Assemble the payload for whatever the user chose, reading live data
 * (verse text from the bundled scripture DB, streak from entries). Pure
 * inputs go through buildWidgetPayload so the shaping stays tested.
 */
export async function assembleWidgetPayload(
  journal: Sql,
  scripture: Sql,
  now: number,
): Promise<WidgetPayload> {
  const cfg = await getWidgetConfig(journal);

  if (cfg.kind === 'note') {
    return buildWidgetPayload({ kind: 'note', now, note: cfg.note });
  }

  if (cfg.kind === 'streak') {
    const rows = await journal.getAllAsync<{ created_at: number }>(
      `SELECT created_at FROM entries WHERE is_archived = 0 AND deleted_at IS NULL`,
    );
    const days = new Set(rows.map((r) => dayKey(r.created_at)));
    const streaks = computeStreaks(days, dayKey(now));
    return buildWidgetPayload({
      kind: 'streak', now, daysJournaled: days.size, currentStreak: streaks.current,
    });
  }

  // verse kinds
  const ref = cfg.kind === 'pinnedVerse' ? cfg.verse : pickDailyVerse(dayKey(now));
  if (!ref) return buildWidgetPayload({ kind: cfg.kind, now });
  const verses = await getPassage(scripture, ref);
  const text = verses.map((v) => v.text).join(' ');
  return buildWidgetPayload({
    kind: cfg.kind, now, verseRefLabel: formatRef(ref), verseText: text,
  });
}

/**
 * Rebuild the payload, store it (so the Android widget task and the in-app
 * preview can read it), and push it to the OS widgets. Call after anything
 * that changes what the widget should show. Returns the payload for preview.
 */
export async function refreshWidget(journal: Sql, scripture: Sql, now: number): Promise<WidgetPayload> {
  const payload = await assembleWidgetPayload(journal, scripture, now);
  await setSetting(journal, 'widget_payload', serializeWidgetPayload(payload));
  await publishWidget(payload);
  return payload;
}
