import { type Book, bookById, findBook } from './books';

/** A parsed scripture reference. `verseEnd` is inclusive; null = single verse or whole chapter. */
export interface VerseRef {
  book: number;
  chapter: number;
  verseStart: number | null; // null = whole chapter
  verseEnd: number | null;
}

const DASHES = /[–—−]/g; // en/em dash, minus → hyphen

/**
 * Parse a human reference: "Psalm 23", "ps 23:1-6", "1 Jn 1:9", "John 3.16".
 * Returns null when the text is not a valid reference (unknown book,
 * chapter out of range, inverted verse range…).
 */
export function parseRef(raw: string): VerseRef | null {
  const text = raw.replace(DASHES, '-').trim();
  // book part = everything up to the first standalone number that starts chapter:verse
  const m = text.match(/^(.+?)\s*(\d{1,3})(?:\s*[:.]\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?)?$/);
  if (!m) {
    const book = findBook(text);
    return book ? { book: book.id, chapter: 1, verseStart: null, verseEnd: null } : null;
  }
  const [, bookRaw, chapterRaw, vsRaw, veRaw] = m;
  const book = findBook(bookRaw);
  if (!book) return null;
  const chapter = parseInt(chapterRaw, 10);
  if (chapter < 1 || chapter > book.chapters) return null;
  if (!vsRaw) return { book: book.id, chapter, verseStart: null, verseEnd: null };
  const verseStart = parseInt(vsRaw, 10);
  if (verseStart < 1) return null;
  if (!veRaw) return { book: book.id, chapter, verseStart, verseEnd: null };
  const verseEnd = parseInt(veRaw, 10);
  if (verseEnd < verseStart) return null;
  return { book: book.id, chapter, verseStart, verseEnd };
}

/** "Psalm 23:1–6", typeset with an en dash; singular "Psalm" when not the whole book. */
export function formatRef(ref: VerseRef): string {
  const book = bookById(ref.book);
  if (!book) return '';
  const name = book.id === 19 ? 'Psalm' : book.name;
  if (ref.verseStart == null) return `${name} ${ref.chapter}`;
  if (ref.verseEnd == null || ref.verseEnd === ref.verseStart) {
    return `${name} ${ref.chapter}:${ref.verseStart}`;
  }
  return `${name} ${ref.chapter}:${ref.verseStart}–${ref.verseEnd}`;
}

/** Short chip form: "Ps 23:1–6". */
export function formatRefShort(ref: VerseRef): string {
  const book = bookById(ref.book);
  if (!book) return '';
  if (ref.verseStart == null) return `${book.abbrev} ${ref.chapter}`;
  if (ref.verseEnd == null || ref.verseEnd === ref.verseStart) {
    return `${book.abbrev} ${ref.chapter}:${ref.verseStart}`;
  }
  return `${book.abbrev} ${ref.chapter}:${ref.verseStart}–${ref.verseEnd}`;
}

export type { Book };
