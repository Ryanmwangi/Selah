import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseInlines, parseMarkdown, snippet } from '../src/lib/markdown';

test('inline bold and italic', () => {
  assert.deepEqual(parseInlines('be **still** and *know*'), [
    { kind: 'text', text: 'be ' },
    { kind: 'bold', text: 'still' },
    { kind: 'text', text: ' and ' },
    { kind: 'italic', text: 'know' },
  ]);
});

test('block structure', () => {
  const blocks = parseMarkdown('# Morning\n\n- pray\n- read\n\n> selah\n\nplain');
  assert.deepEqual(blocks.map((b) => b.kind), [
    'heading', 'blank', 'list-item', 'list-item', 'blank', 'quote', 'blank', 'paragraph',
  ]);
});

test('collapses repeated blank lines', () => {
  const blocks = parseMarkdown('a\n\n\n\nb');
  assert.deepEqual(blocks.map((b) => b.kind), ['paragraph', 'blank', 'paragraph']);
});

test('snippet strips formatting and truncates on grapheme-safe boundary', () => {
  assert.equal(snippet('# Hi\n**bold** and *soft*\n- item'), 'Hi bold and soft item');
  const long = snippet('word '.repeat(100), 40);
  assert.ok(long.length <= 40);
  assert.ok(long.endsWith('…'));
});
