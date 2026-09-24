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

import {
  insertVoice, moveVoiceToLine, normalizeBlocks, parseBody, removeVoice,
  serializeBlocks, stripVoiceMarkers, voiceIdsInBody,
} from '../src/lib/bodyBlocks';
import { setAttachmentLabel } from '../src/repo/attachments';
import { snippet } from '../src/lib/markdown';
import { wordCount } from '../src/lib/insights';

test('body round-trips with voice notes between text', () => {
  const body = 'I walked.\n[[voice:a1]]\nThen wrote.\nMore.\n[[voice:b2]]\n';
  const blocks = parseBody(body);
  assert.deepEqual(blocks.map((b) => b.kind), ['text', 'voice', 'text', 'voice', 'text']);
  assert.equal(serializeBlocks(blocks), body);
  assert.deepEqual(voiceIdsInBody(body), ['a1', 'b2']);
  // a plain entry is a single text block and is unchanged
  assert.equal(serializeBlocks(parseBody('just words\n\nand more')), 'just words\n\nand more');
  assert.equal(serializeBlocks(parseBody('')), '');
});

test('normalize pads voices and merges text', () => {
  const n = normalizeBlocks([{ kind: 'voice', id: 'x' }, { kind: 'voice', id: 'y' }]);
  assert.deepEqual(n.map((b) => b.kind), ['text', 'voice', 'text', 'voice', 'text']);
  const m = normalizeBlocks([{ kind: 'text', text: 'a' }, { kind: 'text', text: 'b' }]);
  assert.deepEqual(m, [{ kind: 'text', text: 'a\nb' }]);
});

test('insert splits text at the cursor', () => {
  const blocks = parseBody('Hello world');
  const out = insertVoice(blocks, 'v', { index: 0, cursor: 5 });
  assert.equal(serializeBlocks(out), 'Hello\n[[voice:v]]\n world');
  // no focus: appended at the end, with somewhere to keep typing
  const end = insertVoice(parseBody('abc'), 'v', null);
  assert.equal(serializeBlocks(end), 'abc\n[[voice:v]]\n');
  assert.equal(end[end.length - 1].kind, 'text');
});

test('a voice note can be dropped between any two lines of text', () => {
  const body = 'l1\nl2\nl3\n[[voice:a]]\nl4';
  // up into the middle of the text: between l1 and l2
  assert.equal(moveVoiceToLine(body, 'a', 1), 'l1\n[[voice:a]]\nl2\nl3\nl4');
  // to the very top and very bottom
  assert.equal(moveVoiceToLine(body, 'a', 0), '\n[[voice:a]]\nl1\nl2\nl3\nl4');
  assert.equal(moveVoiceToLine(body, 'a', 5), 'l1\nl2\nl3\nl4\n[[voice:a]]\n');
  // down past l4 and staying put both keep the text intact
  assert.equal(moveVoiceToLine(body, 'a', 4), 'l1\nl2\nl3\n[[voice:a]]\nl4');
  assert.equal(moveVoiceToLine(body, 'a', 3), 'l1\nl2\nl3\n[[voice:a]]\nl4');
  // unknown id is a no-op
  assert.equal(moveVoiceToLine(body, 'zzz', 1), body);
});

test('moving voice notes past each other and repeatedly leaves no stray blank lines', () => {
  let body = 'one\n[[voice:a]]\ntwo\n[[voice:b]]\nthree';
  body = moveVoiceToLine(body, 'b', 2); // b before "two"
  assert.equal(body, 'one\n[[voice:a]]\n[[voice:b]]\ntwo\nthree'.replace('[[voice:a]]\n[[voice:b]]', '[[voice:a]]\n\n[[voice:b]]'));
  assert.deepEqual(voiceIdsInBody(body), ['a', 'b']);
  // shuffle a voice note around a document 20 times: text and count never change
  const text = 'one\ntwo\nthree\nfour';
  let doc = serializeBlocks(insertVoice(parseBody(text), 'v', { index: 0, cursor: 4 }));
  for (let n = 0; n < 20; n++) doc = moveVoiceToLine(doc, 'v', n % (doc.split('\n').length + 1));
  assert.equal(stripVoiceMarkers(doc).replace(/\n+/g, '\n').replace(/^\n|\n$/g, ''), text);
  assert.equal(voiceIdsInBody(doc).length, 1);
});

test('remove joins the surrounding text', () => {
  const out = removeVoice(parseBody('one\n[[voice:a]]\ntwo'), 'a');
  assert.equal(serializeBlocks(out), 'one\ntwo');
});

test('markers stay out of previews, word counts and export text', async () => {
  const body = 'grace today\n[[voice:abc]]\nmore words';
  assert.equal(stripVoiceMarkers(body), 'grace today\nmore words');
  assert.equal(snippet(body), 'grace today more words');
  assert.equal(wordCount(body), 4);

  const db = await freshJournalDb();
  const e = testId(), v = testId();
  await createEntry(db, { id: e, body: `before\n[[voice:${v}]]\nafter`, createdAt: T0 });
  await addAttachment(db, { id: v, entryId: e, filename: 'v.m4a', type: 'audio', durationMs: 65_000, createdAt: T0 });
  await setAttachmentLabel(db, v, '  Morning prayer ');
  const meta = await getEntryWithMeta(db, e);
  assert.equal(meta?.attachments[0].label, 'Morning prayer');
  const md = exportMarkdown([meta!], new Date(T0));
  assert.match(md, /before\n\*\[Morning prayer, 1:05\]\*\nafter/);
  await setAttachmentLabel(db, v, '   ');
  assert.equal((await getEntryWithMeta(db, e))?.attachments[0].label, null);
});
