/**
 * FTS5 query building.
 *
 * User input is NEVER passed to MATCH raw, FTS5 has its own query syntax
 * (AND/OR/NEAR/quotes/columns) and hostile or merely-punctuated input would
 * error or subvert the search. We tokenize ourselves and emit only
 * double-quoted prefix terms joined by implicit AND.
 */

/** Extract word tokens (unicode letters/digits) from user input. */
export function tokenize(input: string): string[] {
  const matches = input.normalize('NFC').match(/[\p{L}\p{N}]+/gu);
  return matches ? matches.slice(0, 12) : []; // cap terms to keep queries sane
}

/**
 * Build a safe FTS5 MATCH expression: each token becomes "token"* (quoted,
 * prefix-matched). Returns null when there is nothing searchable.
 */
export function buildMatchQuery(input: string): string | null {
  const tokens = tokenize(input);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `"${t.replace(/"/g, '')}"*`).join(' ');
}

export interface SearchFilters {
  text?: string;
  tagId?: string;
  book?: number; // scripture book id
  mood?: string;
  from?: number; // created_at >= (ms epoch)
  to?: number; // created_at < (ms epoch)
  includeArchived?: boolean;
  archivedOnly?: boolean;
}

export interface BuiltQuery {
  sql: string;
  params: (string | number)[];
}

/**
 * Compose the timeline/search SQL from filters. Pure function → unit-testable.
 * Returns entries ordered pinned-first then newest-first.
 */
export function buildSearchQuery(f: SearchFilters, limit = 200): BuiltQuery {
  const where: string[] = [];
  const params: (string | number)[] = [];

  const match = f.text ? buildMatchQuery(f.text) : null;
  let from = 'entries e';
  if (match) {
    from = 'entries_fts fts JOIN entries e ON e.rowid = fts.rowid';
    where.push('entries_fts MATCH ?');
    params.push(match);
  }
  // deleted entries live only in the Recently Deleted screen, never here
  where.push('e.deleted_at IS NULL');
  if (f.archivedOnly) where.push('e.is_archived = 1');
  else if (!f.includeArchived) where.push('e.is_archived = 0');
  if (f.mood) {
    where.push('EXISTS (SELECT 1 FROM entry_moods em WHERE em.entry_id = e.id AND em.mood = ?)');
    params.push(f.mood);
  }
  if (f.from != null) {
    where.push('e.created_at >= ?');
    params.push(f.from);
  }
  if (f.to != null) {
    where.push('e.created_at < ?');
    params.push(f.to);
  }
  if (f.tagId) {
    where.push('EXISTS (SELECT 1 FROM entry_tags et WHERE et.entry_id = e.id AND et.tag_id = ?)');
    params.push(f.tagId);
  }
  if (f.book != null) {
    where.push('EXISTS (SELECT 1 FROM verse_links vl WHERE vl.entry_id = e.id AND vl.book = ?)');
    params.push(f.book);
  }

  const order = match
    ? 'ORDER BY e.is_pinned DESC, rank, e.created_at DESC'
    : 'ORDER BY e.is_pinned DESC, e.created_at DESC';

  const sql = `SELECT e.* FROM ${from}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ${order} LIMIT ${limit}`;
  return { sql, params };
}
