/**
 * Canonical Protestant 66-book metadata.
 * `id` is stable (1–66) and is what verse_links stores.
 * `slug` matches the WEB source JSON filenames used by scripts/build-scripture-db.mjs.
 * `aliases` feed the reference parser, lowercase, no punctuation.
 */
export interface Book {
  id: number;
  name: string;
  abbrev: string;
  slug: string;
  chapters: number;
  aliases: string[];
}

const b = (
  id: number,
  name: string,
  abbrev: string,
  slug: string,
  chapters: number,
  aliases: string[] = [],
): Book => ({ id, name, abbrev, slug, chapters, aliases });

export const BOOKS: Book[] = [
  b(1, 'Genesis', 'Gen', 'genesis', 50, ['gen', 'ge', 'gn']),
  b(2, 'Exodus', 'Exod', 'exodus', 40, ['exod', 'exo', 'ex']),
  b(3, 'Leviticus', 'Lev', 'leviticus', 27, ['lev', 'le', 'lv']),
  b(4, 'Numbers', 'Num', 'numbers', 36, ['num', 'nu', 'nm', 'nb']),
  b(5, 'Deuteronomy', 'Deut', 'deuteronomy', 34, ['deut', 'deu', 'dt']),
  b(6, 'Joshua', 'Josh', 'joshua', 24, ['josh', 'jos', 'jsh']),
  b(7, 'Judges', 'Judg', 'judges', 21, ['judg', 'jdg', 'jg', 'jdgs']),
  b(8, 'Ruth', 'Ruth', 'ruth', 4, ['rth', 'ru']),
  b(9, '1 Samuel', '1Sam', '1samuel', 31, ['1sam', '1sa', '1sm', '1s', 'i samuel', '1st samuel']),
  b(10, '2 Samuel', '2Sam', '2samuel', 24, ['2sam', '2sa', '2sm', '2s', 'ii samuel', '2nd samuel']),
  b(11, '1 Kings', '1Kgs', '1kings', 22, ['1kgs', '1kings', '1ki', '1k', 'i kings', '1st kings']),
  b(12, '2 Kings', '2Kgs', '2kings', 25, ['2kgs', '2kings', '2ki', '2k', 'ii kings', '2nd kings']),
  b(13, '1 Chronicles', '1Chr', '1chronicles', 29, ['1chr', '1ch', '1chron', 'i chronicles']),
  b(14, '2 Chronicles', '2Chr', '2chronicles', 36, ['2chr', '2ch', '2chron', 'ii chronicles']),
  b(15, 'Ezra', 'Ezra', 'ezra', 10, ['ezr', 'ez']),
  b(16, 'Nehemiah', 'Neh', 'nehemiah', 13, ['neh', 'ne']),
  b(17, 'Esther', 'Esth', 'esther', 10, ['esth', 'est', 'es']),
  b(18, 'Job', 'Job', 'job', 42, ['jb']),
  b(19, 'Psalms', 'Ps', 'psalms', 150, ['ps', 'psalm', 'pslm', 'psa', 'psm', 'pss']),
  b(20, 'Proverbs', 'Prov', 'proverbs', 31, ['prov', 'pro', 'prv', 'pr']),
  b(21, 'Ecclesiastes', 'Eccl', 'ecclesiastes', 12, ['eccl', 'ecc', 'ec', 'qoheleth']),
  b(22, 'Song of Solomon', 'Song', 'songofsolomon', 8, ['song', 'sos', 'so', 'song of songs', 'canticles', 'sng']),
  b(23, 'Isaiah', 'Isa', 'isaiah', 66, ['isa', 'is']),
  b(24, 'Jeremiah', 'Jer', 'jeremiah', 52, ['jer', 'je', 'jr']),
  b(25, 'Lamentations', 'Lam', 'lamentations', 5, ['lam', 'la']),
  b(26, 'Ezekiel', 'Ezek', 'ezekiel', 48, ['ezek', 'eze', 'ezk']),
  b(27, 'Daniel', 'Dan', 'daniel', 12, ['dan', 'da', 'dn']),
  b(28, 'Hosea', 'Hos', 'hosea', 14, ['hos', 'ho']),
  b(29, 'Joel', 'Joel', 'joel', 3, ['jl']),
  b(30, 'Amos', 'Amos', 'amos', 9, ['am']),
  b(31, 'Obadiah', 'Obad', 'obadiah', 1, ['obad', 'oba', 'ob']),
  b(32, 'Jonah', 'Jonah', 'jonah', 4, ['jnh', 'jon']),
  b(33, 'Micah', 'Mic', 'micah', 7, ['mic', 'mc']),
  b(34, 'Nahum', 'Nah', 'nahum', 3, ['nah', 'na']),
  b(35, 'Habakkuk', 'Hab', 'habakkuk', 3, ['hab', 'hb']),
  b(36, 'Zephaniah', 'Zeph', 'zephaniah', 3, ['zeph', 'zep', 'zp']),
  b(37, 'Haggai', 'Hag', 'haggai', 2, ['hag', 'hg']),
  b(38, 'Zechariah', 'Zech', 'zechariah', 14, ['zech', 'zec', 'zc']),
  b(39, 'Malachi', 'Mal', 'malachi', 4, ['mal', 'ml']),
  b(40, 'Matthew', 'Matt', 'matthew', 28, ['matt', 'mat', 'mt']),
  b(41, 'Mark', 'Mark', 'mark', 16, ['mrk', 'mk', 'mr']),
  b(42, 'Luke', 'Luke', 'luke', 24, ['luk', 'lk']),
  b(43, 'John', 'John', 'john', 21, ['jhn', 'jn', 'joh']),
  b(44, 'Acts', 'Acts', 'acts', 28, ['act', 'ac']),
  b(45, 'Romans', 'Rom', 'romans', 16, ['rom', 'ro', 'rm']),
  b(46, '1 Corinthians', '1Cor', '1corinthians', 16, ['1cor', '1co', 'i corinthians', '1st corinthians']),
  b(47, '2 Corinthians', '2Cor', '2corinthians', 13, ['2cor', '2co', 'ii corinthians', '2nd corinthians']),
  b(48, 'Galatians', 'Gal', 'galatians', 6, ['gal', 'ga']),
  b(49, 'Ephesians', 'Eph', 'ephesians', 6, ['eph', 'ephes']),
  b(50, 'Philippians', 'Phil', 'philippians', 4, ['phil', 'php', 'pp']),
  b(51, 'Colossians', 'Col', 'colossians', 4, ['col', 'co']),
  b(52, '1 Thessalonians', '1Thess', '1thessalonians', 5, ['1thess', '1thes', '1th', 'i thessalonians']),
  b(53, '2 Thessalonians', '2Thess', '2thessalonians', 3, ['2thess', '2thes', '2th', 'ii thessalonians']),
  b(54, '1 Timothy', '1Tim', '1timothy', 6, ['1tim', '1ti', 'i timothy', '1st timothy']),
  b(55, '2 Timothy', '2Tim', '2timothy', 4, ['2tim', '2ti', 'ii timothy', '2nd timothy']),
  b(56, 'Titus', 'Titus', 'titus', 3, ['tit', 'ti']),
  b(57, 'Philemon', 'Phlm', 'philemon', 1, ['phlm', 'phm', 'philem']),
  b(58, 'Hebrews', 'Heb', 'hebrews', 13, ['heb']),
  b(59, 'James', 'Jas', 'james', 5, ['jas', 'jm']),
  b(60, '1 Peter', '1Pet', '1peter', 5, ['1pet', '1pe', '1pt', '1p', 'i peter']),
  b(61, '2 Peter', '2Pet', '2peter', 3, ['2pet', '2pe', '2pt', '2p', 'ii peter']),
  b(62, '1 John', '1John', '1john', 5, ['1jn', '1jhn', '1jo', '1j', 'i john']),
  b(63, '2 John', '2John', '2john', 1, ['2jn', '2jhn', '2jo', '2j', 'ii john']),
  b(64, '3 John', '3John', '3john', 1, ['3jn', '3jhn', '3jo', '3j', 'iii john']),
  b(65, 'Jude', 'Jude', 'jude', 1, ['jud', 'jd']),
  b(66, 'Revelation', 'Rev', 'revelation', 22, ['rev', 're', 'the revelation', 'apocalypse']),
];

export const bookById = (id: number): Book | undefined => BOOKS[id - 1]?.id === id ? BOOKS[id - 1] : BOOKS.find((x) => x.id === id);

/** Old Testament = 1–39, New Testament = 40–66 */
export const OT = BOOKS.slice(0, 39);
export const NT = BOOKS.slice(39);

/** Lookup table: normalized alias/name → book. Built once. */
const lookup = new Map<string, Book>();
for (const book of BOOKS) {
  lookup.set(book.name.toLowerCase(), book);
  lookup.set(book.abbrev.toLowerCase(), book);
  lookup.set(book.slug, book);
  for (const a of book.aliases) lookup.set(a, book);
}

/** Normalize a candidate book name: lowercase, collapse spaces, strip dots. */
export function normalizeBookName(raw: string): string {
  return raw.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

export function findBook(raw: string): Book | undefined {
  const n = normalizeBookName(raw);
  const direct = lookup.get(n) ?? lookup.get(n.replace(/\s/g, ''));
  if (direct) return direct;
  // Unique-prefix match on full names ("ephes" → Ephesians)
  if (n.length >= 3) {
    const hits = BOOKS.filter((x) => x.name.toLowerCase().startsWith(n));
    if (hits.length === 1) return hits[0];
  }
  return undefined;
}
