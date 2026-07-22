import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createEntry, listDeleted, purgeExpiredDeleted, restoreEntry, searchEntries,
  softDeleteEntry, TRASH_RETENTION_MS, countEntries,
} from '../src/repo/entries';
import { addAttachment } from '../src/repo/attachments';
import { freshJournalDb, testId } from './helpers/testDb';

const T0 = 1_700_000_000_000;

test('soft-deleted entries vanish from timeline, search, and counts', async () => {
  const db = await freshJournalDb();
  const keep = testId(), gone = testId();
  await createEntry(db, { id: keep, body: 'still here', createdAt: T0 });
  await createEntry(db, { id: gone, body: 'mistakenly written', createdAt: T0 + 1 });

  await softDeleteEntry(db, gone, T0 + 100);

  const timeline = await searchEntries(db, {});
  assert.deepEqual(timeline.map((e) => e.id), [keep]);
  // FTS search must not resurface it
  const found = await searchEntries(db, { text: 'mistakenly' });
  assert.equal(found.length, 0);
  // archived view must not show it either
  const archived = await searchEntries(db, { archivedOnly: true });
  assert.equal(archived.length, 0);
  assert.equal(await countEntries(db), 1);

  const trash = await listDeleted(db);
  assert.deepEqual(trash.map((e) => e.id), [gone]);
  assert.equal(trash[0].deleted_at, T0 + 100);
});

test('restore brings an entry back intact', async () => {
  const db = await freshJournalDb();
  const id = testId();
  await createEntry(db, { id, body: 'precious words', createdAt: T0 });
  await softDeleteEntry(db, id, T0 + 100);
  await restoreEntry(db, id);

  const timeline = await searchEntries(db, {});
  assert.deepEqual(timeline.map((e) => e.id), [id]);
  const found = await searchEntries(db, { text: 'precious' });
  assert.equal(found.length, 1);
  assert.equal((await listDeleted(db)).length, 0);
});

test('purge removes only entries past retention, returns their photo files', async () => {
  const db = await freshJournalDb();
  const old = testId(), recent = testId();
  await createEntry(db, { id: old, body: 'long gone', createdAt: T0 });
  await createEntry(db, { id: recent, body: 'just deleted', createdAt: T0 });
  await addAttachment(db, { id: testId(), entryId: old, filename: 'old-photo.jpg', createdAt: T0 });

  const now = T0 + TRASH_RETENTION_MS + 5000;
  await softDeleteEntry(db, old, T0); // deleted long ago
  await softDeleteEntry(db, recent, now - 1000); // deleted moments ago

  const files = await purgeExpiredDeleted(db, now - TRASH_RETENTION_MS);
  assert.deepEqual(files, ['old-photo.jpg']);

  const trash = await listDeleted(db);
  assert.deepEqual(trash.map((e) => e.id), [recent]);
  // cascade cleaned the attachment row
  const orphan = await db.getAllAsync(`SELECT * FROM attachments WHERE entry_id = ?`, [old]);
  assert.equal(orphan.length, 0);
});

test('archivedOnly filter shows archived, hides live and deleted', async () => {
  const db = await freshJournalDb();
  const { setArchived } = await import('../src/repo/entries');
  const live = testId(), arch = testId(), del = testId();
  await createEntry(db, { id: live, body: 'live', createdAt: T0 });
  await createEntry(db, { id: arch, body: 'archived', createdAt: T0 + 1 });
  await createEntry(db, { id: del, body: 'deleted', createdAt: T0 + 2 });
  await setArchived(db, arch, true);
  await setArchived(db, del, true);
  await softDeleteEntry(db, del, T0 + 10);

  const archived = await searchEntries(db, { archivedOnly: true });
  assert.deepEqual(archived.map((e) => e.id), [arch]);
});
