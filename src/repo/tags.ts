import type { Sql } from '../db/sql';
import type { Tag } from './types';

export async function listTags(db: Sql): Promise<Tag[]> {
  return db.getAllAsync<Tag>(`SELECT * FROM tags ORDER BY name COLLATE NOCASE`);
}

/** Create if missing (case-insensitive), return the tag. */
export async function ensureTag(db: Sql, id: string, name: string, color?: string): Promise<Tag> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('tag name is empty');
  const existing = await db.getFirstAsync<Tag>(`SELECT * FROM tags WHERE name = ? COLLATE NOCASE`, [trimmed]);
  if (existing) return existing;
  await db.runAsync(`INSERT INTO tags (id, name, color) VALUES (?, ?, ?)`, [id, trimmed, color ?? null]);
  return { id, name: trimmed, color: color ?? null };
}

export async function deleteTag(db: Sql, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM tags WHERE id = ?`, [id]);
}

export async function setEntryTags(db: Sql, entryId: string, tagIds: string[]): Promise<void> {
  await db.runAsync(`DELETE FROM entry_tags WHERE entry_id = ?`, [entryId]);
  for (const tagId of tagIds) {
    await db.runAsync(`INSERT OR IGNORE INTO entry_tags (entry_id, tag_id) VALUES (?, ?)`, [entryId, tagId]);
  }
}

export async function tagUsageCounts(db: Sql): Promise<Array<Tag & { uses: number }>> {
  return db.getAllAsync<Tag & { uses: number }>(
    `SELECT t.*, COUNT(et.entry_id) AS uses FROM tags t
     LEFT JOIN entry_tags et ON et.tag_id = t.id
     GROUP BY t.id ORDER BY uses DESC, t.name COLLATE NOCASE`,
  );
}
