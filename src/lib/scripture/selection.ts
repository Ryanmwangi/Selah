import type { VerseRef } from './refs';

/**
 * Collapse a set of selected verse numbers into contiguous reference runs.
 * e.g. book 19, chapter 23, [1,2,3,5] -> Ps 23:1-3 and Ps 23:5.
 * Pure, so verse-selection behavior is unit-testable.
 */
export function selectionToRefs(book: number, chapter: number, verses: Iterable<number>): VerseRef[] {
  const sorted = [...new Set(verses)].filter((v) => Number.isInteger(v) && v >= 1).sort((a, b) => a - b);
  const runs: VerseRef[] = [];
  let start: number | null = null;
  let prev: number | null = null;
  for (const v of sorted) {
    if (start === null) {
      start = v;
      prev = v;
    } else if (v === prev! + 1) {
      prev = v;
    } else {
      runs.push({ book, chapter, verseStart: start, verseEnd: prev === start ? null : prev });
      start = v;
      prev = v;
    }
  }
  if (start !== null) runs.push({ book, chapter, verseStart: start, verseEnd: prev === start ? null : prev });
  return runs;
}
