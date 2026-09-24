import type { Sql } from '../db/sql';
import { computeStreaks, dayKey, topCounts, weekProgress, wordCount, type Streaks } from '../lib/insights';
import { bookById } from '../lib/scripture/books';

export interface InsightsData {
  totalEntries: number;
  daysJournaled: number;
  streaks: Streaks;
  week: { done: number; goal: number };
  totalWords: number;
  photoCount: number;
  moodCounts: Array<[string, number]>;
  topBooks: Array<[string, number]>;
  topTags: Array<[string, number]>;
  journaledDayKeys: Set<string>;
  firstEntryAt: number | null;
}

/** One pass over the journal → everything the dashboard needs. */
export async function loadInsights(db: Sql, now: number, weeklyGoal: number): Promise<InsightsData> {
  const rows = await db.getAllAsync<{ created_at: number; body: string }>(
    `SELECT created_at, body FROM entries WHERE is_archived = 0 AND deleted_at IS NULL`,
  );
  const moodRows = await db.getAllAsync<{ mood: string }>(
    `SELECT em.mood FROM entry_moods em JOIN entries e ON e.id = em.entry_id WHERE e.is_archived = 0 AND e.deleted_at IS NULL`,
  );
  const bookRows = await db.getAllAsync<{ book: number }>(
    `SELECT vl.book FROM verse_links vl JOIN entries e ON e.id = vl.entry_id WHERE e.is_archived = 0 AND e.deleted_at IS NULL`,
  );
  const tagRows = await db.getAllAsync<{ name: string }>(
    `SELECT t.name FROM tags t JOIN entry_tags et ON et.tag_id = t.id
     JOIN entries e ON e.id = et.entry_id WHERE e.is_archived = 0 AND e.deleted_at IS NULL`,
  );
  const photoRow = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM attachments WHERE type = 'photo'`);

  const keys = rows.map((r) => dayKey(r.created_at));
  const journaledDayKeys = new Set(keys);
  const today = dayKey(now);

  return {
    totalEntries: rows.length,
    daysJournaled: journaledDayKeys.size,
    streaks: computeStreaks(journaledDayKeys, today),
    week: { done: weekProgress(journaledDayKeys, today).done, goal: weeklyGoal },
    totalWords: rows.reduce((sum, r) => sum + wordCount(r.body), 0),
    photoCount: photoRow?.n ?? 0,
    moodCounts: topCounts(moodRows.map((m) => m.mood), 6),
    topBooks: topCounts(bookRows.map((b) => bookById(b.book)?.name ?? '?'), 3),
    topTags: topCounts(tagRows.map((t) => t.name), 3),
    journaledDayKeys,
    firstEntryAt: rows.length ? Math.min(...rows.map((r) => r.created_at)) : null,
  };
}
