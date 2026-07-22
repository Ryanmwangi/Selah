import type { Sql } from '../db/sql';
import type { VerseRef } from '../lib/scripture/refs';
import type { VerseLink } from './types';

export async function addVerseLink(
  db: Sql,
  id: string,
  entryId: string,
  ref: VerseRef,
  translation = 'WEB',
): Promise<void> {
  await db.runAsync(
    `INSERT INTO verse_links (id, entry_id, book, chapter, verse_start, verse_end, translation)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, entryId, ref.book, ref.chapter, ref.verseStart ?? 1, ref.verseEnd, translation],
  );
}

export async function removeVerseLink(db: Sql, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM verse_links WHERE id = ?`, [id]);
}

export async function linksForEntry(db: Sql, entryId: string): Promise<VerseLink[]> {
  return db.getAllAsync<VerseLink>(
    `SELECT * FROM verse_links WHERE entry_id = ? ORDER BY book, chapter, verse_start`,
    [entryId],
  );
}

/** Replace all links on an entry (used by the composer on save). */
export async function setEntryVerseLinks(
  db: Sql,
  entryId: string,
  links: Array<{ id: string; ref: VerseRef; translation?: string }>,
): Promise<void> {
  await db.runAsync(`DELETE FROM verse_links WHERE entry_id = ?`, [entryId]);
  for (const l of links) {
    await addVerseLink(db, l.id, entryId, l.ref, l.translation ?? 'WEB');
  }
}

export function linkToRef(l: VerseLink): VerseRef {
  return { book: l.book, chapter: l.chapter, verseStart: l.verse_start, verseEnd: l.verse_end };
}
