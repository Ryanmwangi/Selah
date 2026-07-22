import type { Sql } from '../db/sql';
import { buildSearchQuery, type SearchFilters } from '../lib/search/query';
import type { Attachment, Entry, EntryWithMeta, Tag, VerseLink } from './types';

export interface NewEntry {
  id: string;
  title?: string | null;
  body: string;
  createdAt: number;
  placeName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface EntryPatch {
  title?: string | null;
  body?: string;
  placeName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export async function createEntry(db: Sql, e: NewEntry): Promise<void> {
  await db.runAsync(
    `INSERT INTO entries (id, title, body, created_at, updated_at, place_name, latitude, longitude)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [e.id, e.title ?? null, e.body, e.createdAt, e.createdAt,
     e.placeName ?? null, e.latitude ?? null, e.longitude ?? null],
  );
}

export async function updateEntry(db: Sql, id: string, patch: EntryPatch, updatedAt: number): Promise<void> {
  const sets: string[] = ['updated_at = ?'];
  const params: (string | number | null)[] = [updatedAt];
  if ('title' in patch) {
    sets.push('title = ?');
    params.push(patch.title ?? null);
  }
  if (patch.body !== undefined) {
    sets.push('body = ?');
    params.push(patch.body);
  }
  if ('placeName' in patch) {
    sets.push('place_name = ?', 'latitude = ?', 'longitude = ?');
    params.push(patch.placeName ?? null, patch.latitude ?? null, patch.longitude ?? null);
  }
  params.push(id);
  await db.runAsync(`UPDATE entries SET ${sets.join(', ')} WHERE id = ?`, params);
}

/** Replace the mood set on an entry (multi-select). */
export async function setEntryMoods(db: Sql, entryId: string, moods: string[]): Promise<void> {
  await db.runAsync(`DELETE FROM entry_moods WHERE entry_id = ?`, [entryId]);
  for (const mood of moods) {
    await db.runAsync(`INSERT OR IGNORE INTO entry_moods (entry_id, mood) VALUES (?, ?)`, [entryId, mood]);
  }
}

/** Days an entry rests in Recently Deleted before being purged forever. */
export const TRASH_RETENTION_DAYS = 7;
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

/** Hard delete, used by purge and "Delete now". Composer discard also uses this. */
export async function deleteEntry(db: Sql, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM entries WHERE id = ?`, [id]);
}

/** Move an entry to Recently Deleted (recoverable for TRASH_RETENTION_DAYS). */
export async function softDeleteEntry(db: Sql, id: string, now: number): Promise<void> {
  await db.runAsync(`UPDATE entries SET deleted_at = ? WHERE id = ?`, [now, id]);
}

export async function restoreEntry(db: Sql, id: string): Promise<void> {
  await db.runAsync(`UPDATE entries SET deleted_at = NULL WHERE id = ?`, [id]);
}

/** Recently deleted entries, newest deletion first. */
export async function listDeleted(db: Sql): Promise<EntryWithMeta[]> {
  const rows = await db.getAllAsync<Entry>(
    `SELECT * FROM entries WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`,
  );
  return decorate(db, rows);
}

/**
 * Permanently remove entries deleted before `cutoff`.
 * Returns the photo filenames that must also be removed from disk.
 */
export async function purgeExpiredDeleted(db: Sql, cutoff: number): Promise<string[]> {
  const files = await db.getAllAsync<{ filename: string }>(
    `SELECT a.filename FROM attachments a JOIN entries e ON e.id = a.entry_id
     WHERE e.deleted_at IS NOT NULL AND e.deleted_at < ?`,
    [cutoff],
  );
  await db.runAsync(`DELETE FROM entries WHERE deleted_at IS NOT NULL AND deleted_at < ?`, [cutoff]);
  return files.map((f) => f.filename);
}

export async function setPinned(db: Sql, id: string, pinned: boolean): Promise<void> {
  await db.runAsync(`UPDATE entries SET is_pinned = ? WHERE id = ?`, [pinned ? 1 : 0, id]);
}

export async function setArchived(db: Sql, id: string, archived: boolean): Promise<void> {
  await db.runAsync(`UPDATE entries SET is_archived = ? WHERE id = ?`, [archived ? 1 : 0, id]);
}

export async function getEntry(db: Sql, id: string): Promise<Entry | null> {
  return db.getFirstAsync<Entry>(`SELECT * FROM entries WHERE id = ?`, [id]);
}

async function decorate(db: Sql, entries: Entry[]): Promise<EntryWithMeta[]> {
  if (entries.length === 0) return [];
  const ids = entries.map((e) => e.id);
  const ph = ids.map(() => '?').join(',');
  const links = await db.getAllAsync<VerseLink>(
    `SELECT * FROM verse_links WHERE entry_id IN (${ph}) ORDER BY book, chapter, verse_start`,
    ids,
  );
  const tags = await db.getAllAsync<Tag & { entry_id: string }>(
    `SELECT t.*, et.entry_id FROM tags t JOIN entry_tags et ON et.tag_id = t.id WHERE et.entry_id IN (${ph}) ORDER BY t.name`,
    ids,
  );
  const moods = await db.getAllAsync<{ entry_id: string; mood: string }>(
    `SELECT entry_id, mood FROM entry_moods WHERE entry_id IN (${ph})`,
    ids,
  );
  const attachments = await db.getAllAsync<Attachment>(
    `SELECT * FROM attachments WHERE entry_id IN (${ph}) ORDER BY created_at`,
    ids,
  );
  return entries.map((e) => ({
    ...e,
    verseLinks: links.filter((l) => l.entry_id === e.id),
    tags: tags.filter((t) => t.entry_id === e.id).map(({ entry_id: _drop, ...t }) => t),
    moods: moods.filter((m) => m.entry_id === e.id).map((m) => m.mood),
    attachments: attachments.filter((a) => a.entry_id === e.id),
  }));
}

/** Timeline & search share one query path. */
export async function searchEntries(db: Sql, filters: SearchFilters, limit = 200): Promise<EntryWithMeta[]> {
  const { sql, params } = buildSearchQuery(filters, limit);
  const rows = await db.getAllAsync<Entry>(sql, params);
  return decorate(db, rows);
}

export async function getEntryWithMeta(db: Sql, id: string): Promise<EntryWithMeta | null> {
  const e = await getEntry(db, id);
  if (!e) return null;
  const [decorated] = await decorate(db, [e]);
  return decorated;
}

/** Entries linked to a passage (any overlap with the chapter; verse overlap when given). */
export async function entriesForPassage(
  db: Sql,
  book: number,
  chapter: number,
  verse?: number,
): Promise<EntryWithMeta[]> {
  const rows = verse == null
    ? await db.getAllAsync<Entry>(
        `SELECT DISTINCT e.* FROM entries e JOIN verse_links vl ON vl.entry_id = e.id
         WHERE vl.book = ? AND vl.chapter = ? AND e.is_archived = 0 AND e.deleted_at IS NULL ORDER BY e.created_at DESC`,
        [book, chapter],
      )
    : await db.getAllAsync<Entry>(
        `SELECT DISTINCT e.* FROM entries e JOIN verse_links vl ON vl.entry_id = e.id
         WHERE vl.book = ? AND vl.chapter = ?
           AND vl.verse_start <= ? AND COALESCE(vl.verse_end, vl.verse_start) >= ?
           AND e.is_archived = 0 AND e.deleted_at IS NULL ORDER BY e.created_at DESC`,
        [book, chapter, verse, verse],
      );
  return decorate(db, rows);
}

/** "On this day", entries from this calendar day in previous years (local time windows supplied by caller). */
export async function entriesInWindows(db: Sql, windows: Array<[number, number]>): Promise<EntryWithMeta[]> {
  if (windows.length === 0) return [];
  const clauses = windows.map(() => '(created_at >= ? AND created_at < ?)').join(' OR ');
  const params = windows.flat();
  const rows = await db.getAllAsync<Entry>(
    `SELECT * FROM entries WHERE is_archived = 0 AND deleted_at IS NULL AND (${clauses}) ORDER BY created_at DESC`,
    params,
  );
  return decorate(db, rows);
}

export async function countEntries(db: Sql): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM entries WHERE deleted_at IS NULL`);
  return row?.n ?? 0;
}
