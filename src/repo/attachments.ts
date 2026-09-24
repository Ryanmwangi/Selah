import type { Sql } from '../db/sql';
import type { Attachment } from './types';

export async function addAttachment(
  db: Sql,
  a: {
    id: string; entryId: string; filename: string; type?: 'photo' | 'audio';
    width?: number | null; height?: number | null; durationMs?: number | null; createdAt: number;
  },
): Promise<void> {
  await db.runAsync(
    `INSERT INTO attachments (id, entry_id, type, filename, width, height, duration_ms, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [a.id, a.entryId, a.type ?? 'photo', a.filename, a.width ?? null, a.height ?? null, a.durationMs ?? null, a.createdAt],
  );
}

export async function removeAttachment(db: Sql, id: string): Promise<void> {
  await db.runAsync(`DELETE FROM attachments WHERE id = ?`, [id]);
}

export async function attachmentsForEntry(db: Sql, entryId: string): Promise<Attachment[]> {
  return db.getAllAsync<Attachment>(
    `SELECT * FROM attachments WHERE entry_id = ? ORDER BY created_at`,
    [entryId],
  );
}

export async function countPhotos(db: Sql): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM attachments WHERE type = 'photo'`);
  return row?.n ?? 0;
}
