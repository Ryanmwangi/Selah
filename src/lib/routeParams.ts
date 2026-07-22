import type { VerseRef } from './scripture/refs';

/** Compact verse ref for route params: "19.23.1.6", "43.3.16." , "19.23.." */
export function encodeVerseParam(ref: VerseRef): string {
  return [ref.book, ref.chapter, ref.verseStart ?? '', ref.verseEnd ?? ''].join('.');
}

export function decodeVerseParam(raw: string | undefined): VerseRef | null {
  if (!raw) return null;
  const [b, c, vs, ve] = raw.split('.');
  const book = Number(b);
  const chapter = Number(c);
  if (!Number.isInteger(book) || book < 1 || book > 66 || !Number.isInteger(chapter) || chapter < 1) {
    return null;
  }
  const verseStart = vs ? Number(vs) : null;
  const verseEnd = ve ? Number(ve) : null;
  if (verseStart != null && !Number.isInteger(verseStart)) return null;
  if (verseEnd != null && !Number.isInteger(verseEnd)) return null;
  return { book, chapter, verseStart, verseEnd };
}

/** Several refs joined with "~"; used when journaling about multiple verses. */
export function encodeVerseParams(refs: VerseRef[]): string {
  return refs.map(encodeVerseParam).join('~');
}

export function decodeVerseParams(raw: string | undefined): VerseRef[] {
  if (!raw) return [];
  return raw.split('~').map(decodeVerseParam).filter((r): r is VerseRef => r != null);
}
