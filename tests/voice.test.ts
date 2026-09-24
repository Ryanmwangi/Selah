import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addAttachment, attachmentsForEntry, countPhotos } from '../src/repo/attachments';
import { createEntry, getEntryWithMeta, purgeExpiredDeleted, softDeleteEntry, TRASH_RETENTION_MS } from '../src/repo/entries';
import { formatDuration } from '../src/lib/duration';
import { exportMarkdown } from '../src/lib/export';
import { freshJournalDb, testId } from './helpers/testDb';

const T0 = 1_700_000_000_000;

test('voice notes store type and duration, and are not counted as photos', async () => {
  const db = await freshJournalDb();
  const e = testId();
  await createEntry(db, { id: e, body: 'spoken', createdAt: T0 });
  await addAttachment(db, { id: testId(), entryId: e, filename: 'a.jpg', createdAt: T0 });
  await addAttachment(db, {
    id: testId(), entryId: e, filename: 'v.m4a', type: 'audio', durationMs: 12_345, createdAt: T0 + 1,
  });

  const rows = await attachmentsForEntry(db, e);
  assert.deepEqual(rows.map((r) => r.type), ['photo', 'audio']);
  assert.equal(rows[1].duration_ms, 12_345);
  assert.equal(rows[0].duration_ms, null);
  assert.equal(await countPhotos(db), 1);

  const meta = await getEntryWithMeta(db, e);
  assert.equal(meta?.attachments.length, 2);
});

test('a voice-only entry survives; purge returns its file and cascades', async () => {
  const db = await freshJournalDb();
  const e = testId();
  await createEntry(db, { id: e, body: '', createdAt: T0 });
  await addAttachment(db, { id: testId(), entryId: e, filename: 'v.m4a', type: 'audio', durationMs: 4000, createdAt: T0 });
  await softDeleteEntry(db, e, T0);
  const files = await purgeExpiredDeleted(db, T0 + TRASH_RETENTION_MS + 1);
  assert.deepEqual(files, ['v.m4a']);
  assert.equal((await attachmentsForEntry(db, e)).length, 0);
});

test('export mentions voice notes separately from photos', async () => {
  const db = await freshJournalDb();
  const e = testId();
  await createEntry(db, { id: e, body: 'hi', createdAt: T0 });
  await addAttachment(db, { id: testId(), entryId: e, filename: 'a.jpg', createdAt: T0 });
  await addAttachment(db, { id: testId(), entryId: e, filename: 'v.m4a', type: 'audio', durationMs: 1000, createdAt: T0 });
  await addAttachment(db, { id: testId(), entryId: e, filename: 'w.m4a', type: 'audio', durationMs: 1000, createdAt: T0 });
  const meta = await getEntryWithMeta(db, e);
  const md = exportMarkdown([meta!], new Date(T0));
  assert.match(md, /1 photo/);
  assert.match(md, /2 voice notes/);
});

test('formatDuration', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(7400), '0:07');
  assert.equal(formatDuration(92_000), '1:32');
  assert.equal(formatDuration(725_000), '12:05');
});
