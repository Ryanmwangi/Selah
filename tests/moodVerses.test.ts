import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { bookById } from '../src/lib/scripture/books';
import { MOOD_VERSES, versesForMood } from '../src/lib/scripture/moodVerses';
import { formatRef } from '../src/lib/scripture/refs';
import { MOOD_META } from '../src/theme/tokens';
import { MOODS } from '../src/repo/types';
import { getPassage } from '../src/repo/scripture';
import { TestDb } from './helpers/testDb';

const DB_PATH = join(__dirname, '..', '..', '..', 'assets', 'scripture', 'web.db');
const hasDb = existsSync(DB_PATH);

test('every mood has a color, a label, and a healthy set of verses', () => {
  for (const mood of MOODS) {
    assert.ok(MOOD_META[mood], `missing MOOD_META for ${mood}`);
    const verses = versesForMood(mood);
    assert.ok(verses.length >= 5, `${mood} has only ${verses.length} verses`);
  }
});

test('mood verse refs are structurally valid', () => {
  for (const [mood, refs] of Object.entries(MOOD_VERSES)) {
    for (const ref of refs) {
      const book = bookById(ref.book);
      assert.ok(book, `${mood}: unknown book ${ref.book}`);
      assert.ok(ref.chapter >= 1 && ref.chapter <= book!.chapters, `${mood}: ${formatRef(ref)} chapter out of range`);
      assert.ok(ref.verseStart != null && ref.verseStart >= 1, `${mood}: ${formatRef(ref)} bad verseStart`);
      if (ref.verseEnd != null) assert.ok(ref.verseEnd >= ref.verseStart!, `${mood}: ${formatRef(ref)} inverted range`);
    }
  }
});

test('every mood verse resolves in the bundled Bible', { skip: !hasDb }, async () => {
  const db = new TestDb(DB_PATH);
  const failures: string[] = [];
  for (const [mood, refs] of Object.entries(MOOD_VERSES)) {
    for (const ref of refs) {
      const verses = await getPassage(db, ref);
      if (verses.length === 0) failures.push(`${mood}: ${formatRef(ref)} (no text)`);
      // a whole requested range should exist end-to-end
      if (ref.verseEnd != null && verses.length !== ref.verseEnd - ref.verseStart! + 1) {
        failures.push(`${mood}: ${formatRef(ref)} (got ${verses.length} of ${ref.verseEnd - ref.verseStart! + 1})`);
      }
    }
  }
  assert.deepEqual(failures, [], `invalid mood verses:\n${failures.join('\n')}`);
});
