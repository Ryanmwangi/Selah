import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildWidgetPayload, parseWidgetPayload, serializeWidgetPayload,
} from '../src/lib/widget/payload';

const NOW = 1_700_000_000_000;

test('note payload: normal, empty, and overlong', () => {
  const p = buildWidgetPayload({ kind: 'note', now: NOW, note: '  Be still today.  ' });
  assert.equal(p.body, 'Be still today.');
  assert.equal(p.eyebrow, 'A note to yourself');
  assert.equal(p.updatedAt, NOW);

  const empty = buildWidgetPayload({ kind: 'note', now: NOW, note: '   ' });
  assert.match(empty.body, /leave yourself/i);

  const long = buildWidgetPayload({ kind: 'note', now: NOW, note: 'x'.repeat(500) });
  assert.ok(long.body.length <= 240);
  assert.ok(long.body.endsWith('…'));
});

test('streak payload reflects state', () => {
  const active = buildWidgetPayload({ kind: 'streak', now: NOW, daysJournaled: 12, currentStreak: 4 });
  assert.equal(active.body, '4-day streak');
  assert.equal(active.footer, '12 days journaled');
  assert.equal(active.accessoryShort, '4d');

  const lapsed = buildWidgetPayload({ kind: 'streak', now: NOW, daysJournaled: 5, currentStreak: 0 });
  assert.match(lapsed.body, /begin again/i);

  const fresh = buildWidgetPayload({ kind: 'streak', now: NOW, daysJournaled: 0, currentStreak: 0 });
  assert.match(fresh.body, /first pause/i);
  assert.equal(fresh.accessoryShort, '—');
});

test('verse payloads quote text and cite the reference', () => {
  const v = buildWidgetPayload({
    kind: 'dailyVerse', now: NOW,
    verseRefLabel: 'Psalm 46:10', verseText: 'Be still, and know that I am God.',
  });
  assert.equal(v.eyebrow, 'Psalm 46:10');
  assert.ok(v.body.startsWith('“') && v.body.endsWith('”'));
  assert.equal(v.footer, 'Psalm 46:10 · WEB');
  assert.equal(v.accessoryShort, 'Psalm 46:10');

  const missing = buildWidgetPayload({ kind: 'pinnedVerse', now: NOW });
  assert.match(missing.body, /choose a verse/i);
});

test('serialize/parse round-trips and rejects junk', () => {
  const p = buildWidgetPayload({ kind: 'note', now: NOW, note: 'grace' });
  assert.deepEqual(parseWidgetPayload(serializeWidgetPayload(p)), p);
  assert.equal(parseWidgetPayload(null), null);
  assert.equal(parseWidgetPayload('not json'), null);
  assert.equal(parseWidgetPayload('{"nope":1}'), null);
});
