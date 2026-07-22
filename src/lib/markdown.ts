/**
 * Tiny markdown subset for journal entries: **bold**, *italic*, - lists,
 * > quotes, ## headings. Parsed to a token tree the renderer maps to
 * styled <Text>. No HTML, no links-with-JS, no images, journals are text.
 */

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string };

export type Block =
  | { kind: 'paragraph'; inlines: Inline[] }
  | { kind: 'heading'; level: 1 | 2; inlines: Inline[] }
  | { kind: 'list-item'; inlines: Inline[] }
  | { kind: 'quote'; inlines: Inline[] }
  | { kind: 'blank' };

export function parseInlines(text: string): Inline[] {
  const out: Inline[] = [];
  // **bold** first, then *italic*; single pass with a combined regex.
  const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ kind: 'text', text: text.slice(last, m.index) });
    if (m[1] != null) out.push({ kind: 'bold', text: m[1] });
    else out.push({ kind: 'italic', text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out.length ? out : [{ kind: 'text', text: '' }];
}

export function parseMarkdown(body: string): Block[] {
  const blocks: Block[] = [];
  for (const line of body.split('\n')) {
    const t = line.trimEnd();
    if (t.trim() === '') {
      blocks.push({ kind: 'blank' });
    } else if (t.startsWith('## ')) {
      blocks.push({ kind: 'heading', level: 2, inlines: parseInlines(t.slice(3)) });
    } else if (t.startsWith('# ')) {
      blocks.push({ kind: 'heading', level: 1, inlines: parseInlines(t.slice(2)) });
    } else if (/^[-*]\s+/.test(t.trim())) {
      blocks.push({ kind: 'list-item', inlines: parseInlines(t.trim().replace(/^[-*]\s+/, '')) });
    } else if (t.trim().startsWith('> ')) {
      blocks.push({ kind: 'quote', inlines: parseInlines(t.trim().slice(2)) });
    } else {
      blocks.push({ kind: 'paragraph', inlines: parseInlines(t) });
    }
  }
  // collapse runs of blanks
  return blocks.filter((blk, i) => blk.kind !== 'blank' || blocks[i - 1]?.kind !== 'blank');
}

/** Plain-text snippet for timeline cards: markdown stripped, whitespace collapsed. */
export function snippet(body: string, max = 160): string {
  const plain = body
    .replace(/^#{1,2}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length <= max ? plain : `${plain.slice(0, max - 1).trimEnd()}…`;
}
