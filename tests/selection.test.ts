import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectionToRefs } from '../src/lib/scripture/selection';
import { decodeVerseParams, encodeVerseParams } from '../src/lib/routeParams';

test('single verse becomes a single ref', () => {
  assert.deepEqual(selectionToRefs(19, 23, [1]), [
    { book: 19, chapter: 23, verseStart: 1, verseEnd: null },
  ]);
});

test('contiguous verses collapse into one range', () => {
  assert.deepEqual(selectionToRefs(19, 23, [1, 2, 3]), [
    { book: 19, chapter: 23, verseStart: 1, verseEnd: 3 },
  ]);
});

test('gaps split into multiple runs, order-independent, deduped', () => {
  assert.deepEqual(selectionToRefs(19, 23, [5, 1, 3, 2, 3]), [
    { book: 19, chapter: 23, verseStart: 1, verseEnd: 3 },
    { book: 19, chapter: 23, verseStart: 5, verseEnd: null },
  ]);
});

test('invalid verse numbers are ignored', () => {
  assert.deepEqual(selectionToRefs(43, 3, [0, -2, 16]), [
    { book: 43, chapter: 3, verseStart: 16, verseEnd: null },
  ]);
  assert.deepEqual(selectionToRefs(43, 3, []), []);
});

test('multi-ref params round-trip through the composer link', () => {
  const refs = selectionToRefs(19, 23, [1, 2, 3, 5]);
  const encoded = encodeVerseParams(refs);
  assert.ok(encoded.includes('~'));
  assert.deepEqual(decodeVerseParams(encoded), refs);
  // a single ref (no separator) still decodes
  assert.deepEqual(decodeVerseParams('43.3.16.'), [
    { book: 43, chapter: 3, verseStart: 16, verseEnd: null },
  ]);
  assert.deepEqual(decodeVerseParams(undefined), []);
});
