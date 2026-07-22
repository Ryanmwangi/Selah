/**
 * Scripture for how you feel — a curated, healthy set of passages for each
 * mood. Refs use canonical book ids (see books.ts); text is loaded on demand
 * from the bundled WEB database, so this file stays small.
 *
 * Chosen pastorally: comfort for the hard moods, and passages that deepen the
 * good ones. Ranges are kept short so a verse card reads in one breath.
 */
import type { VerseRef } from './refs';

const v = (book: number, chapter: number, verseStart: number, verseEnd: number | null = null): VerseRef => ({
  book, chapter, verseStart, verseEnd,
});

// book ids: Deut 5, Josh 6, Neh 16, Job 18, Ps 19, Prov 20, Eccl 21, Isa 23,
// Jer 24, Lam 25, Zeph 36, Matt 40, Mark 41, Luke 42, John 43, Rom 45,
// 1Cor 46, 2Cor 47, Gal 48, Eph 49, Phil 50, Col 51, 1Thess 52, 1Tim 54,
// 2Tim 55, Heb 58, Jas 59, 1Pet 60, 1John 62, Rev 66.

export const MOOD_VERSES: Record<string, VerseRef[]> = {
  still: [
    v(19, 46, 10), v(19, 23, 1, 3), v(19, 131, 2), v(2, 14, 14),
    v(36, 3, 17), v(19, 62, 1, 2), v(25, 3, 25, 26),
  ],
  grateful: [
    v(52, 5, 16, 18), v(19, 100, 4, 5), v(51, 3, 15, 17), v(19, 107, 1),
    v(19, 103, 1, 5), v(59, 1, 17), v(19, 118, 1),
  ],
  hopeful: [
    v(45, 15, 13), v(24, 29, 11), v(25, 3, 22, 24), v(19, 42, 5),
    v(23, 40, 31), v(58, 6, 19), v(45, 8, 24, 25),
  ],
  rejoicing: [
    v(19, 118, 24), v(50, 4, 4), v(19, 16, 11), v(16, 8, 10),
    v(19, 126, 3), v(36, 3, 17), v(19, 100, 1, 2),
  ],
  peaceful: [
    v(43, 14, 27), v(50, 4, 6, 7), v(23, 26, 3), v(19, 4, 8),
    v(51, 3, 15), v(45, 15, 13), v(4, 6, 24, 26),
  ],
  content: [
    v(50, 4, 11, 13), v(54, 6, 6, 8), v(58, 13, 5), v(19, 23, 1),
    v(20, 30, 8, 9), v(21, 3, 12, 13), v(19, 16, 5, 6),
  ],
  anxious: [
    v(50, 4, 6, 7), v(40, 6, 25, 27), v(60, 5, 6, 7), v(19, 94, 19),
    v(19, 55, 22), v(43, 14, 27), v(23, 41, 10),
  ],
  afraid: [
    v(23, 41, 10), v(19, 23, 4), v(19, 27, 1), v(5, 31, 6),
    v(6, 1, 9), v(55, 1, 7), v(19, 56, 3),
  ],
  weary: [
    v(40, 11, 28, 30), v(23, 40, 28, 31), v(48, 6, 9), v(19, 23, 1, 3),
    v(47, 4, 16, 17), v(19, 73, 26), v(23, 41, 10),
  ],
  lonely: [
    v(5, 31, 6), v(19, 25, 16), v(19, 68, 6), v(40, 28, 20),
    v(58, 13, 5), v(19, 139, 7, 10), v(23, 41, 10),
  ],
  heavy: [
    v(19, 34, 18), v(40, 5, 4), v(19, 147, 3), v(66, 21, 4),
    v(19, 30, 5), v(43, 16, 22), v(47, 1, 3, 4), v(19, 42, 11),
  ],
  discouraged: [
    v(6, 1, 9), v(19, 42, 11), v(23, 40, 31), v(48, 6, 9),
    v(47, 4, 8, 9), v(19, 34, 18), v(5, 31, 8),
  ],
  wrestling: [
    v(19, 13, 1, 2), v(1, 32, 24, 28), v(19, 73, 25, 26), v(18, 42, 1, 5),
    v(41, 9, 24), v(19, 77, 1, 3), v(35, 3, 17, 18),
  ],
  angry: [
    v(49, 4, 26, 27), v(59, 1, 19, 20), v(20, 15, 1), v(19, 4, 4),
    v(20, 29, 11), v(51, 3, 8), v(45, 12, 19),
  ],
  tempted: [
    v(46, 10, 13), v(59, 1, 12, 14), v(58, 4, 15, 16), v(40, 26, 41),
    v(19, 119, 11), v(60, 5, 8, 9), v(48, 5, 16),
  ],
};

export function versesForMood(mood: string): VerseRef[] {
  return MOOD_VERSES[mood] ?? [];
}
