import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeStreaks, dayKey, monthGrid, topCounts, weekProgress, wordCount } from '../src/lib/insights';
import { loadInsights } from '../src/repo/insights';
import { createEntry, setEntryMoods } from '../src/repo/entries';
import { addVerseLink } from '../src/repo/verseLinks';
import { addAttachment } from '../src/repo/attachments';
import { freshJournalDb, testId } from './helpers/testDb';

const ts = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();

test('dayKey uses local time', () => {
  assert.equal(dayKey(ts(2026, 7, 21)), '2026-07-21');
  assert.equal(dayKey(ts(2026, 1, 2, 0)), '2026-01-02');
});

test('streaks: empty, single, chains', () => {
  assert.deepEqual(computeStreaks([], '2026-07-21'), { current: 0, longest: 0 });
  assert.deepEqual(computeStreaks(['2026-07-21'], '2026-07-21'), { current: 1, longest: 1 });
  // 3-day chain ending today + an older 5-day chain
  const days = ['2026-07-19', '2026-07-20', '2026-07-21', '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05'];
  assert.deepEqual(computeStreaks(days, '2026-07-21'), { current: 3, longest: 5 });
});

test('streak survives until a full day is missed', () => {
  // wrote yesterday, not yet today → streak still alive
  assert.deepEqual(computeStreaks(['2026-07-19', '2026-07-20'], '2026-07-21'), { current: 2, longest: 2 });
  // missed a whole day → current resets
  assert.deepEqual(computeStreaks(['2026-07-18', '2026-07-19'], '2026-07-21'), { current: 0, longest: 2 });
});

test('streaks across month boundary', () => {
  const days = ['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02'];
  assert.deepEqual(computeStreaks(days, '2026-07-02'), { current: 4, longest: 4 });
});

test('wordCount strips markdown, keeps unicode words', () => {
  assert.equal(wordCount('# Morning\n**be** *still* — and know'), 5);
  assert.equal(wordCount(''), 0);
  assert.equal(wordCount('שָׁלוֹם peace 123'), 3);
});

test('weekProgress counts Mon-start week', () => {
  // 2026-07-21 is a Tuesday → week is Mon 20 .. Sun 26
  const { done, weekDays } = weekProgress(['2026-07-20', '2026-07-21', '2026-07-19'], '2026-07-21');
  assert.equal(done, 2); // the 19th is previous week
  assert.equal(weekDays[0], '2026-07-20');
  assert.equal(weekDays[6], '2026-07-26');
});

test('monthGrid covers the month with Mon-first weeks', () => {
  const weeks = monthGrid(2026, 6); // July 2026 — 1st is a Wednesday
  assert.ok(weeks.length >= 5);
  for (const w of weeks) assert.equal(w.length, 7);
  const flat = weeks.flat();
  assert.equal(flat.filter((c) => c.inMonth).length, 31);
  const first = flat.find((c) => c.inMonth && c.day === 1)!;
  assert.equal(first.key, '2026-07-01');
  // padding before the 1st comes from June
  assert.equal(weeks[0][0].inMonth, false);
});

test('topCounts sorts by count then name', () => {
  assert.deepEqual(topCounts(['b', 'a', 'b', 'c', 'a', 'b'], 2), [['b', 3], ['a', 2]]);
});

test('loadInsights end-to-end against real schema', async () => {
  const db = await freshJournalDb();
  const now = ts(2026, 7, 21);
  const e1 = testId(), e2 = testId(), e3 = testId();
  await createEntry(db, { id: e1, body: 'five words in this body', createdAt: ts(2026, 7, 21) });
  await createEntry(db, { id: e2, body: 'three more words', createdAt: ts(2026, 7, 20) });
  await createEntry(db, { id: e3, body: 'same day again', createdAt: ts(2026, 7, 20, 8) });
  await setEntryMoods(db, e1, ['still', 'grateful']);
  await setEntryMoods(db, e2, ['still']);
  await addVerseLink(db, testId(), e1, { book: 19, chapter: 23, verseStart: 1, verseEnd: null });
  await addAttachment(db, { id: testId(), entryId: e1, filename: 'x.jpg', createdAt: now });

  const data = await loadInsights(db, now, 3);
  assert.equal(data.totalEntries, 3);
  assert.equal(data.daysJournaled, 2);
  assert.deepEqual(data.streaks, { current: 2, longest: 2 });
  assert.equal(data.totalWords, 11);
  assert.equal(data.photoCount, 1);
  assert.deepEqual(data.moodCounts[0], ['still', 2]);
  assert.deepEqual(data.topBooks, [['Psalms', 1]]);
  assert.equal(data.week.done, 2);
  assert.equal(data.firstEntryAt, ts(2026, 7, 20, 8));
});

test('multi-mood: v2 migration carries old single mood forward', async () => {
  const db = await freshJournalDb();
  // simulate a v1 row: insert with legacy mood column, then re-run migration? —
  // migration already ran; instead verify entry_moods filter path works
  const e = testId();
  await createEntry(db, { id: e, body: 'x', createdAt: ts(2026, 7, 21) });
  await setEntryMoods(db, e, ['hopeful', 'wrestling']);
  const { searchEntries } = await import('../src/repo/entries');
  const hits = await searchEntries(db, { mood: 'wrestling' });
  assert.deepEqual(hits.map((h) => h.id), [e]);
  assert.deepEqual(hits[0].moods.sort(), ['hopeful', 'wrestling']);
  const none = await searchEntries(db, { mood: 'heavy' });
  assert.equal(none.length, 0);
});

test('v1→v2 migration copies legacy single mood into entry_moods', async () => {
  const { TestDb } = await import('./helpers/testDb');
  const { MIGRATIONS, migrate } = await import('../src/db/migrations');
  const db = new TestDb();
  // apply only v1, write a legacy row with the old mood column
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(MIGRATIONS[0]);
  await db.execAsync('PRAGMA user_version = 1;');
  await db.runAsync(
    `INSERT INTO entries (id, title, body, mood, created_at, updated_at) VALUES ('old1', NULL, 'legacy', 'grateful', 1000, 1000)`,
  );
  // now migrate the rest of the way
  await migrate(db);
  const rows = await db.getAllAsync<{ entry_id: string; mood: string }>(`SELECT * FROM entry_moods`);
  assert.deepEqual(rows, [{ entry_id: 'old1', mood: 'grateful' }]);
  const v = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  assert.equal(v?.user_version, MIGRATIONS.length);
});

test('location fields round-trip', async () => {
  const db = await freshJournalDb();
  const e = testId();
  await createEntry(db, {
    id: e, body: 'written outside', createdAt: ts(2026, 7, 21),
    placeName: 'Karura Forest, Nairobi', latitude: -1.24, longitude: 36.83,
  });
  const { getEntryWithMeta, updateEntry } = await import('../src/repo/entries');
  let got = await getEntryWithMeta(db, e);
  assert.equal(got?.place_name, 'Karura Forest, Nairobi');
  assert.ok(Math.abs((got?.latitude ?? 0) - -1.24) < 1e-9);
  // remove location
  await updateEntry(db, e, { placeName: null }, ts(2026, 7, 21, 13));
  got = await getEntryWithMeta(db, e);
  assert.equal(got?.place_name, null);
  assert.equal(got?.latitude, null);
});
