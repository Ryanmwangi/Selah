#!/usr/bin/env node
/**
 * Builds assets/scripture/web.db — the bundled, offline World English Bible.
 *
 * Source: https://github.com/TehShrike/world-english-bible (public domain JSON).
 * Output schema:
 *   books(id INTEGER PK, name TEXT, abbrev TEXT, chapters INTEGER)
 *   verses(book INTEGER, chapter INTEGER, verse INTEGER, text TEXT,
 *          PRIMARY KEY(book, chapter, verse)) WITHOUT ROWID
 *
 * Run: npm run build:scripture   (idempotent; skips download if cache exists)
 */
import Database from 'better-sqlite3';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const appRoot = join(root, '..');
const cacheDir = join(appRoot, '.scripture-cache');
const outDir = join(appRoot, 'assets', 'scripture');
const outPath = join(outDir, 'web.db');

// Keep in sync with src/lib/scripture/books.ts (id order is canonical).
const BOOKS = [
  ['Genesis', 'Gen', 'genesis', 50], ['Exodus', 'Exod', 'exodus', 40], ['Leviticus', 'Lev', 'leviticus', 27],
  ['Numbers', 'Num', 'numbers', 36], ['Deuteronomy', 'Deut', 'deuteronomy', 34], ['Joshua', 'Josh', 'joshua', 24],
  ['Judges', 'Judg', 'judges', 21], ['Ruth', 'Ruth', 'ruth', 4], ['1 Samuel', '1Sam', '1samuel', 31],
  ['2 Samuel', '2Sam', '2samuel', 24], ['1 Kings', '1Kgs', '1kings', 22], ['2 Kings', '2Kgs', '2kings', 25],
  ['1 Chronicles', '1Chr', '1chronicles', 29], ['2 Chronicles', '2Chr', '2chronicles', 36], ['Ezra', 'Ezra', 'ezra', 10],
  ['Nehemiah', 'Neh', 'nehemiah', 13], ['Esther', 'Esth', 'esther', 10], ['Job', 'Job', 'job', 42],
  ['Psalms', 'Ps', 'psalms', 150], ['Proverbs', 'Prov', 'proverbs', 31], ['Ecclesiastes', 'Eccl', 'ecclesiastes', 12],
  ['Song of Solomon', 'Song', 'songofsolomon', 8], ['Isaiah', 'Isa', 'isaiah', 66], ['Jeremiah', 'Jer', 'jeremiah', 52],
  ['Lamentations', 'Lam', 'lamentations', 5], ['Ezekiel', 'Ezek', 'ezekiel', 48], ['Daniel', 'Dan', 'daniel', 12],
  ['Hosea', 'Hos', 'hosea', 14], ['Joel', 'Joel', 'joel', 3], ['Amos', 'Amos', 'amos', 9],
  ['Obadiah', 'Obad', 'obadiah', 1], ['Jonah', 'Jonah', 'jonah', 4], ['Micah', 'Mic', 'micah', 7],
  ['Nahum', 'Nah', 'nahum', 3], ['Habakkuk', 'Hab', 'habakkuk', 3], ['Zephaniah', 'Zeph', 'zephaniah', 3],
  ['Haggai', 'Hag', 'haggai', 2], ['Zechariah', 'Zech', 'zechariah', 14], ['Malachi', 'Mal', 'malachi', 4],
  ['Matthew', 'Matt', 'matthew', 28], ['Mark', 'Mark', 'mark', 16], ['Luke', 'Luke', 'luke', 24],
  ['John', 'John', 'john', 21], ['Acts', 'Acts', 'acts', 28], ['Romans', 'Rom', 'romans', 16],
  ['1 Corinthians', '1Cor', '1corinthians', 16], ['2 Corinthians', '2Cor', '2corinthians', 13],
  ['Galatians', 'Gal', 'galatians', 6], ['Ephesians', 'Eph', 'ephesians', 6], ['Philippians', 'Phil', 'philippians', 4],
  ['Colossians', 'Col', 'colossians', 4], ['1 Thessalonians', '1Thess', '1thessalonians', 5],
  ['2 Thessalonians', '2Thess', '2thessalonians', 3], ['1 Timothy', '1Tim', '1timothy', 6],
  ['2 Timothy', '2Tim', '2timothy', 4], ['Titus', 'Titus', 'titus', 3], ['Philemon', 'Phlm', 'philemon', 1],
  ['Hebrews', 'Heb', 'hebrews', 13], ['James', 'Jas', 'james', 5], ['1 Peter', '1Pet', '1peter', 5],
  ['2 Peter', '2Pet', '2peter', 3], ['1 John', '1John', '1john', 5], ['2 John', '2John', '2john', 1],
  ['3 John', '3John', '3john', 1], ['Jude', 'Jude', 'jude', 1], ['Revelation', 'Rev', 'revelation', 22],
];

const SRC = 'https://raw.githubusercontent.com/TehShrike/world-english-bible/master/json';

async function fetchBook(slug) {
  const cached = join(cacheDir, `${slug}.json`);
  if (existsSync(cached)) return JSON.parse(readFileSync(cached, 'utf8'));
  const res = await fetch(`${SRC}/${slug}.json`);
  if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
  const text = await res.text();
  writeFileSync(cached, text);
  return JSON.parse(text);
}

function versesOf(chunks) {
  // Group "line text" / "paragraph text" chunks into whole verses.
  const map = new Map(); // "c:v" -> string
  for (const c of chunks) {
    if ((c.type === 'paragraph text' || c.type === 'line text') && c.chapterNumber && c.verseNumber) {
      const key = `${c.chapterNumber}:${c.verseNumber}`;
      map.set(key, (map.get(key) ?? '') + c.value);
    }
  }
  return [...map.entries()].map(([key, text]) => {
    const [chapter, verse] = key.split(':').map(Number);
    return { chapter, verse, text: text.replace(/\s+/g, ' ').trim() };
  });
}

mkdirSync(cacheDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const db = new Database(outPath);
db.pragma('journal_mode = MEMORY');
db.exec(`
  DROP TABLE IF EXISTS books; DROP TABLE IF EXISTS verses; DROP TABLE IF EXISTS meta;
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE books (id INTEGER PRIMARY KEY, name TEXT NOT NULL, abbrev TEXT NOT NULL, chapters INTEGER NOT NULL);
  CREATE TABLE verses (
    book INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL, text TEXT NOT NULL,
    PRIMARY KEY (book, chapter, verse)
  ) WITHOUT ROWID;
`);
db.prepare(`INSERT INTO meta VALUES ('translation', 'WEB'), ('name', 'World English Bible'), ('license', 'Public Domain')`).run();

const insBook = db.prepare('INSERT INTO books VALUES (?, ?, ?, ?)');
const insVerse = db.prepare('INSERT INTO verses VALUES (?, ?, ?, ?)');

let total = 0;
for (let i = 0; i < BOOKS.length; i++) {
  const [name, abbrev, slug, chapters] = BOOKS[i];
  const id = i + 1;
  const chunks = await fetchBook(slug);
  const verses = versesOf(chunks);
  if (verses.length === 0) throw new Error(`${slug}: no verses parsed`);
  insBook.run(id, name, abbrev, chapters);
  const tx = db.transaction(() => {
    for (const v of verses) insVerse.run(id, v.chapter, v.verse, v.text);
  });
  tx();
  total += verses.length;
  process.stdout.write(`\r${id}/66 ${name} (${verses.length} verses, ${total} total)   `);
}
db.exec('VACUUM');
db.close();
console.log(`\nWrote ${outPath} — ${total} verses.`);
