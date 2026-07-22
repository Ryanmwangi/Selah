import type { Sql } from '../db/sql';
import type { VerseRef } from '../lib/scripture/refs';

export interface Verse {
  book: number;
  chapter: number;
  verse: number;
  text: string;
}

/** Fetch the verses of a reference from the bundled translation DB. */
export async function getPassage(db: Sql, ref: VerseRef): Promise<Verse[]> {
  if (ref.verseStart == null) {
    return db.getAllAsync<Verse>(
      `SELECT * FROM verses WHERE book = ? AND chapter = ? ORDER BY verse`,
      [ref.book, ref.chapter],
    );
  }
  const end = ref.verseEnd ?? ref.verseStart;
  return db.getAllAsync<Verse>(
    `SELECT * FROM verses WHERE book = ? AND chapter = ? AND verse BETWEEN ? AND ? ORDER BY verse`,
    [ref.book, ref.chapter, ref.verseStart, end],
  );
}

/** Highest verse number in a chapter (drives the range picker). */
export async function verseCount(db: Sql, book: number, chapter: number): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT MAX(verse) AS n FROM verses WHERE book = ? AND chapter = ?`,
    [book, chapter],
  );
  return row?.n ?? 0;
}

/** A deterministic verse-of-the-day drawn from a curated pool. */
export const DAILY_VERSE_POOL: VerseRef[] = [
  { book: 19, chapter: 23, verseStart: 1, verseEnd: 3 },
  { book: 19, chapter: 46, verseStart: 10, verseEnd: null },
  { book: 19, chapter: 121, verseStart: 1, verseEnd: 2 },
  { book: 19, chapter: 27, verseStart: 1, verseEnd: null },
  { book: 19, chapter: 34, verseStart: 8, verseEnd: null },
  { book: 23, chapter: 40, verseStart: 31, verseEnd: null },
  { book: 23, chapter: 41, verseStart: 10, verseEnd: null },
  { book: 24, chapter: 29, verseStart: 11, verseEnd: null },
  { book: 25, chapter: 3, verseStart: 22, verseEnd: 23 },
  { book: 40, chapter: 6, verseStart: 33, verseEnd: 34 },
  { book: 40, chapter: 11, verseStart: 28, verseEnd: 30 },
  { book: 43, chapter: 15, verseStart: 4, verseEnd: 5 },
  { book: 45, chapter: 8, verseStart: 28, verseEnd: null },
  { book: 45, chapter: 12, verseStart: 1, verseEnd: 2 },
  { book: 50, chapter: 4, verseStart: 6, verseEnd: 7 },
  { book: 20, chapter: 3, verseStart: 5, verseEnd: 6 },
  { book: 62, chapter: 1, verseStart: 9, verseEnd: null },
  { book: 35, chapter: 3, verseStart: 17, verseEnd: 18 },
  { book: 49, chapter: 2, verseStart: 8, verseEnd: 10 },
  { book: 58, chapter: 4, verseStart: 15, verseEnd: 16 },
];

export function pickDailyVerse(dayKey: string): VerseRef {
  let h = 5381;
  for (let i = 0; i < dayKey.length; i++) h = (Math.imul(h, 33) ^ dayKey.charCodeAt(i)) >>> 0;
  return DAILY_VERSE_POOL[h % DAILY_VERSE_POOL.length];
}
