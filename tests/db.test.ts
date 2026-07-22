import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  countEntries, createEntry, deleteEntry, entriesForPassage, entriesInWindows,
  getEntryWithMeta, searchEntries, setArchived, setPinned, updateEntry,
} from '../src/repo/entries';
import { BUILTIN_PROMPTS, listPromptCategories, pickDailyPrompt, seedBuiltinPrompts, listPrompts } from '../src/repo/prompts';
import { ensureTag, setEntryTags, tagUsageCounts, deleteTag } from '../src/repo/tags';
import { addVerseLink, setEntryVerseLinks } from '../src/repo/verseLinks';
import { getSetting, setSetting } from '../src/repo/settings';
import { freshJournalDb, testId } from './helpers/testDb';

const T0 = 1_700_000_000_000;

test('migrations are idempotent and versioned', async () => {
  const db = await freshJournalDb();
  const { migrate, MIGRATIONS } = await import('../src/db/migrations');
  await migrate(db); // second run is a no-op
  const v = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  assert.equal(v?.user_version, MIGRATIONS.length);
});

test('entry CRUD with FTS kept in sync by triggers', async () => {
  const db = await freshJournalDb();
  const id = testId();
  await createEntry(db, { id, title: 'Morning', body: 'The Lord is my shepherd; anxiety fades.', createdAt: T0 });

  let hits = await searchEntries(db, { text: 'anxiety' });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, id);

  // update reindexes
  await updateEntry(db, id, { body: 'Peace like a river.' }, T0 + 1000);
  hits = await searchEntries(db, { text: 'anxiety' });
  assert.equal(hits.length, 0);
  hits = await searchEntries(db, { text: 'river' });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].updated_at, T0 + 1000);

  // prefix search
  hits = await searchEntries(db, { text: 'riv' });
  assert.equal(hits.length, 1);

  // title is searchable too
  hits = await searchEntries(db, { text: 'morning' });
  assert.equal(hits.length, 1);

  // delete deindexes
  await deleteEntry(db, id);
  hits = await searchEntries(db, { text: 'river' });
  assert.equal(hits.length, 0);
  assert.equal(await countEntries(db), 0);
});

test('hostile search input cannot break the query', async () => {
  const db = await freshJournalDb();
  await createEntry(db, { id: testId(), body: 'grace upon grace', createdAt: T0 });
  for (const evil of ['" OR 1=1 --', 'NEAR(', 'a AND (b', '*', '"; DROP TABLE entries;']) {
    await searchEntries(db, { text: evil }); // must not throw
  }
  assert.equal(await countEntries(db), 1);
});

test('pin, archive, ordering', async () => {
  const db = await freshJournalDb();
  const a = testId(), b = testId(), c = testId();
  await createEntry(db, { id: a, body: 'oldest', createdAt: T0 });
  await createEntry(db, { id: b, body: 'middle', createdAt: T0 + 1 });
  await createEntry(db, { id: c, body: 'newest', createdAt: T0 + 2 });
  await setPinned(db, a, true);
  await setArchived(db, b, true);

  const list = await searchEntries(db, {});
  assert.deepEqual(list.map((e) => e.id), [a, c]); // pinned first, archived hidden

  const all = await searchEntries(db, { includeArchived: true });
  assert.equal(all.length, 3);
});

test('tags: ensure is case-insensitive, filter and counts work', async () => {
  const db = await freshJournalDb();
  const e1 = testId(), e2 = testId();
  await createEntry(db, { id: e1, body: 'one', createdAt: T0 });
  await createEntry(db, { id: e2, body: 'two', createdAt: T0 + 1 });

  const t1 = await ensureTag(db, testId(), 'Anxiety');
  const dup = await ensureTag(db, testId(), 'anxiety');
  assert.equal(dup.id, t1.id);

  const t2 = await ensureTag(db, testId(), 'hope', '#B08A3C');
  await setEntryTags(db, e1, [t1.id, t2.id]);
  await setEntryTags(db, e2, [t2.id]);

  const byTag = await searchEntries(db, { tagId: t1.id });
  assert.deepEqual(byTag.map((e) => e.id), [e1]);
  assert.deepEqual(byTag[0].tags.map((t) => t.name).sort(), ['Anxiety', 'hope']);

  const counts = await tagUsageCounts(db);
  assert.deepEqual(counts.map((t) => [t.name, t.uses]), [['hope', 2], ['Anxiety', 1]]);

  // deleting a tag cascades out of entry_tags
  await deleteTag(db, t2.id);
  const after = await getEntryWithMeta(db, e2);
  assert.equal(after?.tags.length, 0);
});

test('verse links: attach, replace, passage lookup with ranges', async () => {
  const db = await freshJournalDb();
  const e1 = testId(), e2 = testId();
  await createEntry(db, { id: e1, body: 'on the shepherd psalm', createdAt: T0 });
  await createEntry(db, { id: e2, body: 'on the gospel', createdAt: T0 + 1 });

  await addVerseLink(db, testId(), e1, { book: 19, chapter: 23, verseStart: 1, verseEnd: 4 });
  await addVerseLink(db, testId(), e2, { book: 43, chapter: 3, verseStart: 16, verseEnd: null });

  // chapter-level lookup
  let hits = await entriesForPassage(db, 19, 23);
  assert.deepEqual(hits.map((e) => e.id), [e1]);

  // verse-level overlap: v3 ∈ 1–4, v5 ∉ 1–4
  hits = await entriesForPassage(db, 19, 23, 3);
  assert.equal(hits.length, 1);
  hits = await entriesForPassage(db, 19, 23, 5);
  assert.equal(hits.length, 0);

  // filter search by book
  const romansless = await searchEntries(db, { book: 43 });
  assert.deepEqual(romansless.map((e) => e.id), [e2]);

  // replace links
  await setEntryVerseLinks(db, e1, [
    { id: testId(), ref: { book: 45, chapter: 8, verseStart: 28, verseEnd: null } },
  ]);
  const meta = await getEntryWithMeta(db, e1);
  assert.equal(meta?.verseLinks.length, 1);
  assert.equal(meta?.verseLinks[0].book, 45);

  // deleting the entry cascades links
  await deleteEntry(db, e2);
  const orphans = await db.getAllAsync(`SELECT * FROM verse_links WHERE entry_id = ?`, [e2]);
  assert.equal(orphans.length, 0);
});

test('combined filters: text + tag + book + date window', async () => {
  const db = await freshJournalDb();
  const match = testId(), noise = testId();
  await createEntry(db, { id: match, body: 'anxious but held', createdAt: T0 + 100 });
  await createEntry(db, { id: noise, body: 'anxious elsewhere', createdAt: T0 + 100 });
  const tag = await ensureTag(db, testId(), 'psalms');
  await setEntryTags(db, match, [tag.id]);
  await addVerseLink(db, testId(), match, { book: 19, chapter: 46, verseStart: 10, verseEnd: null });

  const hits = await searchEntries(db, {
    text: 'anxious', tagId: tag.id, book: 19, from: T0, to: T0 + 200,
  });
  assert.deepEqual(hits.map((e) => e.id), [match]);
});

test('on-this-day windows', async () => {
  const db = await freshJournalDb();
  const past = testId();
  await createEntry(db, { id: past, body: 'a year ago', createdAt: T0 });
  await createEntry(db, { id: testId(), body: 'other time', createdAt: T0 + 10_000_000 });
  const hits = await entriesInWindows(db, [[T0 - 1000, T0 + 1000]]);
  assert.deepEqual(hits.map((e) => e.id), [past]);
});

test('mood filter (multi-mood)', async () => {
  const db = await freshJournalDb();
  const { setEntryMoods } = await import('../src/repo/entries');
  const still = testId(), other = testId();
  await createEntry(db, { id: still, body: 'quiet', createdAt: T0 });
  await createEntry(db, { id: other, body: 'loud', createdAt: T0 + 1 });
  await setEntryMoods(db, still, ['still', 'grateful']);
  await setEntryMoods(db, other, ['wrestling']);
  const hits = await searchEntries(db, { mood: 'still' });
  assert.deepEqual(hits.map((e) => e.id), [still]);
});

test('prompts seed once and pick deterministically', async () => {
  const db = await freshJournalDb();
  await seedBuiltinPrompts(db); // second seed (first ran in migrate? no — explicit) must not duplicate
  await seedBuiltinPrompts(db);
  const prompts = await listPrompts(db);
  assert.equal(prompts.length, BUILTIN_PROMPTS.length);
  const cats = await listPromptCategories(db);
  assert.ok(cats.includes('gratitude') && cats.includes('scripture'));

  const p1 = pickDailyPrompt(prompts, '2026-07-17');
  const p2 = pickDailyPrompt(prompts, '2026-07-17');
  const p3 = pickDailyPrompt(prompts, '2026-07-18');
  assert.equal(p1?.id, p2?.id);
  assert.ok(p3 != null);
});

test('settings upsert', async () => {
  const db = await freshJournalDb();
  assert.equal(await getSetting(db, 'theme'), null);
  await setSetting(db, 'theme', 'vigil');
  await setSetting(db, 'theme', 'dawn');
  assert.equal(await getSetting(db, 'theme'), 'dawn');
});
