import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMatchQuery, buildSearchQuery, tokenize } from '../src/lib/search/query';

test('tokenize extracts words, drops punctuation and FTS syntax', () => {
  assert.deepEqual(tokenize('anxiety AND "grace" OR (peace)'), ['anxiety', 'AND', 'grace', 'OR', 'peace']);
  assert.deepEqual(tokenize('  '), []);
  assert.deepEqual(tokenize('psalm-23: hope!'), ['psalm', '23', 'hope']);
});

test('buildMatchQuery quotes every token as a prefix term', () => {
  assert.equal(buildMatchQuery('anxious heart'), '"anxious"* "heart"*');
  // FTS5 operators are neutralized by quoting
  assert.equal(buildMatchQuery('NEAR(x y)'), '"NEAR"* "x"* "y"*');
  assert.equal(buildMatchQuery('a"b'), '"a"* "b"*');
  assert.equal(buildMatchQuery('!!!'), null);
});

test('buildSearchQuery composes filters with parameters only', () => {
  const q = buildSearchQuery({ text: 'hope', tagId: 't1', book: 19, from: 100, to: 200, mood: 'still' });
  assert.match(q.sql, /entries_fts MATCH \?/);
  assert.match(q.sql, /is_archived = 0/);
  assert.match(q.sql, /et\.tag_id = \?/);
  assert.match(q.sql, /vl\.book = \?/);
  assert.deepEqual(q.params, ['"hope"*', 'still', 100, 200, 't1', 19]);
  // no user text is ever interpolated into SQL
  assert.ok(!q.sql.includes('hope'));
});

test('buildSearchQuery without text avoids the FTS join', () => {
  const q = buildSearchQuery({});
  assert.ok(!q.sql.includes('entries_fts'));
  assert.match(q.sql, /ORDER BY e\.is_pinned DESC, e\.created_at DESC/);
});
