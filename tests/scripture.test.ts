import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { BOOKS } from '../src/lib/scripture/books';
import { getPassage, pickDailyVerse, verseCount, DAILY_VERSE_POOL } from '../src/repo/scripture';
import { bookById } from '../src/lib/scripture/books';
import { TestDb } from './helpers/testDb';

// __dirname at runtime is tests/dist/tests → app root is three levels up.
const DB_PATH = join(__dirname, '..', '..', '..', 'assets', 'scripture', 'web.db');

// Bundled DB integrity — runs against the actual asset shipped in the app.
const hasDb = existsSync(DB_PATH);

test('bundled scripture db exists', () => {
  assert.ok(hasDb, `missing ${DB_PATH} — run npm run build:scripture`);
});

test('all 66 books present with correct chapter counts', { skip: !hasDb }, async () => {
  const db = new TestDb(DB_PATH);
  const rows = await db.getAllAsync<{ id: number; name: string; chapters: number }>(
    'SELECT * FROM books ORDER BY id',
  );
  assert.equal(rows.length, 66);
  for (const book of BOOKS) {
    const row = rows[book.id - 1];
    assert.equal(row.name, book.name);
    assert.equal(row.chapters, book.chapters, book.name);
    // metadata chapter count matches actual verse data
    const max = await db.getFirstAsync<{ n: number }>(
      'SELECT MAX(chapter) AS n FROM verses WHERE book = ?', [book.id],
    );
    assert.equal(max?.n, book.chapters, `${book.name} data chapters`);
  }
});

test('canonical verse total', { skip: !hasDb }, async () => {
  const db = new TestDb(DB_PATH);
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM verses');
  // WEB counts 31,103 verses (KJV canon is 31,102; WEB includes 3 John 15)
  assert.ok(row!.n >= 31_000 && row!.n <= 31_200, `got ${row!.n}`);
});

test('well-known passages read correctly', { skip: !hasDb }, async () => {
  const db = new TestDb(DB_PATH);
  const ps23 = await getPassage(db, { book: 19, chapter: 23, verseStart: 1, verseEnd: null });
  assert.equal(ps23.length, 1);
  assert.match(ps23[0].text, /Yahweh is my shepherd/);

  const john316 = await getPassage(db, { book: 43, chapter: 3, verseStart: 16, verseEnd: null });
  assert.match(john316[0].text, /God so loved the world/);

  const range = await getPassage(db, { book: 19, chapter: 23, verseStart: 1, verseEnd: 6 });
  assert.equal(range.length, 6);

  const wholeChapter = await getPassage(db, { book: 19, chapter: 117, verseStart: null, verseEnd: null });
  assert.equal(wholeChapter.length, 2); // shortest chapter in the Bible

  assert.equal(await verseCount(db, 19, 119), 176); // longest chapter
});

test('daily verse pool is valid and picker is deterministic', { skip: !hasDb }, async () => {
  const db = new TestDb(DB_PATH);
  for (const ref of DAILY_VERSE_POOL) {
    assert.ok(bookById(ref.book), `book ${ref.book}`);
    const verses = await getPassage(db, ref);
    assert.ok(verses.length > 0, `empty passage for book ${ref.book} ch ${ref.chapter}`);
  }
  assert.deepEqual(pickDailyVerse('2026-07-17'), pickDailyVerse('2026-07-17'));
});
