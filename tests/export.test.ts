import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exportMarkdown } from '../src/lib/export';
import type { EntryWithMeta } from '../src/repo/types';

const entry = (over: Partial<EntryWithMeta>): EntryWithMeta => ({
  id: 'e1', title: null, body: 'body text', mood: null,
  created_at: 1_700_000_000_000, updated_at: 1_700_000_000_000,
  is_pinned: 0, is_archived: 0, verseLinks: [], tags: [],
  moods: [], attachments: [], place_name: null, latitude: null, longitude: null, deleted_at: null,
  ...over,
});

test('export renders chronologically with metadata', () => {
  const md = exportMarkdown(
    [
      entry({ id: 'b', title: 'Later', created_at: 2_000_000_000_000, moods: ['still'], place_name: 'Nairobi' }),
      entry({
        id: 'a', title: 'Earlier', created_at: 1_000_000_000_000,
        tags: [{ id: 't', name: 'hope', color: null }],
        verseLinks: [{ id: 'v', entry_id: 'a', book: 19, chapter: 23, verse_start: 1, verse_end: 6, translation: 'WEB' }],
      }),
    ],
    new Date('2026-07-17T00:00:00Z'),
  );
  assert.match(md, /2 entries/);
  assert.ok(md.indexOf('Earlier') < md.indexOf('Later'), 'chronological order');
  assert.match(md, /tags: hope/);
  assert.match(md, /Psalm 23:1–6/);
  assert.match(md, /mood: still/);
  assert.match(md, /at Nairobi/);
});

test('untitled entries fall back to the date', () => {
  const md = exportMarkdown([entry({})], new Date());
  assert.match(md, /## \w{3} \w{3} \d/); // "## Tue Nov 14 ..."
});
