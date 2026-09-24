import type { Sql } from './sql';

/**
 * Hand-written, append-only migrations guarded by PRAGMA user_version.
 * Never edit a shipped migration, append a new one.
 */
export const MIGRATIONS: string[] = [
  // v1, full journal schema + FTS5 external-content index
  `
  CREATE TABLE entries (
    id TEXT PRIMARY KEY,
    title TEXT,
    body TEXT NOT NULL DEFAULT '',
    mood TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX idx_entries_created ON entries(created_at DESC);

  CREATE TABLE verse_links (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    book INTEGER NOT NULL,
    chapter INTEGER NOT NULL,
    verse_start INTEGER NOT NULL,
    verse_end INTEGER,
    translation TEXT NOT NULL DEFAULT 'WEB'
  );
  CREATE INDEX idx_verse_links_entry ON verse_links(entry_id);
  CREATE INDEX idx_verse_links_ref ON verse_links(book, chapter);

  CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    color TEXT
  );
  CREATE TABLE entry_tags (
    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tag_id)
  );

  CREATE TABLE prompts (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    category TEXT NOT NULL,
    is_builtin INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);

  CREATE VIRTUAL TABLE entries_fts USING fts5(
    title, body,
    content='entries', content_rowid='rowid',
    tokenize='unicode61 remove_diacritics 2'
  );
  CREATE TRIGGER entries_ai AFTER INSERT ON entries BEGIN
    INSERT INTO entries_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
  END;
  CREATE TRIGGER entries_ad AFTER DELETE ON entries BEGIN
    INSERT INTO entries_fts(entries_fts, rowid, title, body) VALUES ('delete', old.rowid, old.title, old.body);
  END;
  CREATE TRIGGER entries_au AFTER UPDATE OF title, body ON entries BEGIN
    INSERT INTO entries_fts(entries_fts, rowid, title, body) VALUES ('delete', old.rowid, old.title, old.body);
    INSERT INTO entries_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
  END;
  `,

  // v2, multi-mood, photo attachments, optional location
  `
  CREATE TABLE entry_moods (
    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    mood TEXT NOT NULL,
    PRIMARY KEY (entry_id, mood)
  );
  INSERT INTO entry_moods (entry_id, mood)
    SELECT id, mood FROM entries WHERE mood IS NOT NULL AND mood != '';

  CREATE TABLE attachments (
    id TEXT PRIMARY KEY,
    entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'photo',
    filename TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_attachments_entry ON attachments(entry_id);

  ALTER TABLE entries ADD COLUMN place_name TEXT;
  ALTER TABLE entries ADD COLUMN latitude REAL;
  ALTER TABLE entries ADD COLUMN longitude REAL;
  `,

  // v3, soft delete: entries linger in "Recently deleted" before purge
  `
  ALTER TABLE entries ADD COLUMN deleted_at INTEGER;
  CREATE INDEX idx_entries_deleted ON entries(deleted_at) WHERE deleted_at IS NOT NULL;
  `,

  // v4, voice notes: attachments of type 'audio' carry a duration
  `
  ALTER TABLE attachments ADD COLUMN duration_ms INTEGER;
  `,

  // v5, voice notes can be renamed
  `
  ALTER TABLE attachments ADD COLUMN label TEXT;
  `,
];

export async function migrate(db: Sql): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.execAsync('BEGIN;');
    try {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1};`);
      await db.execAsync('COMMIT;');
    } catch (e) {
      await db.execAsync('ROLLBACK;');
      throw e;
    }
  }
}
