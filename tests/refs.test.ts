import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findBook } from '../src/lib/scripture/books';
import { formatRef, formatRefShort, parseRef } from '../src/lib/scripture/refs';

test('parses plain book + chapter', () => {
  assert.deepEqual(parseRef('Psalm 23'), { book: 19, chapter: 23, verseStart: null, verseEnd: null });
  assert.deepEqual(parseRef('psalms 23'), { book: 19, chapter: 23, verseStart: null, verseEnd: null });
});

test('parses chapter:verse and ranges', () => {
  assert.deepEqual(parseRef('Psalm 23:1-6'), { book: 19, chapter: 23, verseStart: 1, verseEnd: 6 });
  assert.deepEqual(parseRef('John 3:16'), { book: 43, chapter: 3, verseStart: 16, verseEnd: null });
  // en dash and dot separator
  assert.deepEqual(parseRef('Psalm 23:1–6'), { book: 19, chapter: 23, verseStart: 1, verseEnd: 6 });
  assert.deepEqual(parseRef('John 3.16'), { book: 43, chapter: 3, verseStart: 16, verseEnd: null });
});

test('parses numbered books', () => {
  assert.deepEqual(parseRef('1 John 1:9'), { book: 62, chapter: 1, verseStart: 9, verseEnd: null });
  assert.deepEqual(parseRef('1 Jn 1:9'), { book: 62, chapter: 1, verseStart: 9, verseEnd: null });
  assert.deepEqual(parseRef('2 Cor 12:9'), { book: 47, chapter: 12, verseStart: 9, verseEnd: null });
  assert.deepEqual(parseRef('1sam 3:10'), { book: 9, chapter: 3, verseStart: 10, verseEnd: null });
});

test('parses abbreviations with dots and odd spacing', () => {
  assert.deepEqual(parseRef('  Ps.  46 : 10 '), { book: 19, chapter: 46, verseStart: 10, verseEnd: null });
  assert.deepEqual(parseRef('song of songs 2:4'), { book: 22, chapter: 2, verseStart: 4, verseEnd: null });
});

test('single-chapter books', () => {
  assert.deepEqual(parseRef('Jude 1:24'), { book: 65, chapter: 1, verseStart: 24, verseEnd: null });
  assert.deepEqual(parseRef('Philemon 1'), { book: 57, chapter: 1, verseStart: null, verseEnd: null });
});

test('rejects invalid references', () => {
  assert.equal(parseRef('Psalm 151'), null); // out of range
  assert.equal(parseRef('Nonsense 3:16'), null);
  assert.equal(parseRef('John 3:16-2'), null); // inverted range
  assert.equal(parseRef(''), null);
  assert.equal(parseRef('42'), null);
});

test('whole-book input parses as chapter 1', () => {
  assert.deepEqual(parseRef('James'), { book: 59, chapter: 1, verseStart: null, verseEnd: null });
});

test('formats references', () => {
  assert.equal(formatRef({ book: 19, chapter: 23, verseStart: 1, verseEnd: 6 }), 'Psalm 23:1–6');
  assert.equal(formatRef({ book: 19, chapter: 23, verseStart: null, verseEnd: null }), 'Psalm 23');
  assert.equal(formatRef({ book: 43, chapter: 3, verseStart: 16, verseEnd: null }), 'John 3:16');
  assert.equal(formatRef({ book: 43, chapter: 3, verseStart: 16, verseEnd: 16 }), 'John 3:16');
  assert.equal(formatRefShort({ book: 19, chapter: 23, verseStart: 1, verseEnd: 6 }), 'Ps 23:1–6');
});

test('findBook prefix and alias behavior', () => {
  assert.equal(findBook('ephes')?.id, 49);
  assert.equal(findBook('jud')?.id, 65); // exact alias for Jude wins over Judges prefix
  assert.equal(findBook('j'), undefined); // ambiguous
});
