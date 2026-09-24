/**
 * An entry body is plain text with voice notes embedded on their own lines:
 *
 *   I walked this morning.
 *   [[voice:abc123]]
 *   Then I kept writing.
 *
 * so the order of writing and recordings is just the order of the lines.
 * The composer edits the body as blocks (text, voice, text, ...). Blocks are
 * kept normalized: text at both ends and between any two voice notes, so
 * there is always somewhere to type.
 */

export type BodyBlock = { kind: 'text'; text: string } | { kind: 'voice'; id: string };

const MARKER = /^\[\[voice:([A-Za-z0-9_-]+)\]\]$/;
const MARKER_LINES = /^\[\[voice:[A-Za-z0-9_-]+\]\]$\n?/gm;

export function voiceMarker(id: string): string {
  return `[[voice:${id}]]`;
}

/** Merge adjacent text blocks and pad so text bookends every voice note. */
export function normalizeBlocks(blocks: BodyBlock[]): BodyBlock[] {
  const out: BodyBlock[] = [];
  for (const b of blocks) {
    const prev = out[out.length - 1];
    if (b.kind === 'text') {
      if (prev && prev.kind === 'text') out[out.length - 1] = { kind: 'text', text: `${prev.text}\n${b.text}` };
      else out.push(b);
    } else {
      if (!prev || prev.kind === 'voice') out.push({ kind: 'text', text: '' });
      out.push(b);
    }
  }
  if (out.length === 0 || out[out.length - 1].kind === 'voice') out.push({ kind: 'text', text: '' });
  return out;
}

export function parseBody(body: string): BodyBlock[] {
  const blocks: BodyBlock[] = [];
  let text: string[] = [];
  for (const line of body.split('\n')) {
    const m = MARKER.exec(line);
    if (m) {
      blocks.push({ kind: 'text', text: text.join('\n') });
      blocks.push({ kind: 'voice', id: m[1] });
      text = [];
    } else {
      text.push(line);
    }
  }
  blocks.push({ kind: 'text', text: text.join('\n') });
  return normalizeBlocks(blocks);
}

export function serializeBlocks(blocks: BodyBlock[]): string {
  return blocks.map((b) => (b.kind === 'text' ? b.text : voiceMarker(b.id))).join('\n');
}

export function voiceIdsInBody(body: string): string[] {
  return parseBody(body).flatMap((b) => (b.kind === 'voice' ? [b.id] : []));
}

/** Body without voice-note lines: for previews, word counts, search snippets. */
export function stripVoiceMarkers(body: string): string {
  return body.replace(MARKER_LINES, '');
}

/** Split text block `index` at `cursor` and put the voice note between the halves. */
export function insertVoice(blocks: BodyBlock[], voiceId: string, at: { index: number; cursor: number } | null): BodyBlock[] {
  const target = at && blocks[at.index]?.kind === 'text' ? at : null;
  if (!target) return normalizeBlocks([...blocks, { kind: 'voice', id: voiceId }]);
  const block = blocks[target.index] as { kind: 'text'; text: string };
  const cut = Math.max(0, Math.min(target.cursor, block.text.length));
  const before = block.text.slice(0, cut).replace(/\n$/, '');
  const after = block.text.slice(cut).replace(/^\n/, '');
  const next = [...blocks];
  next.splice(target.index, 1,
    { kind: 'text', text: before }, { kind: 'voice', id: voiceId }, { kind: 'text', text: after });
  return normalizeBlocks(next);
}

export function removeVoice(blocks: BodyBlock[], voiceId: string): BodyBlock[] {
  return normalizeBlocks(blocks.filter((b) => !(b.kind === 'voice' && b.id === voiceId)));
}

const isMarkerLine = (line: string | undefined) => line !== undefined && MARKER.test(line);

/**
 * Move a voice note to sit before body line `toLine` (0..lines, counting the
 * voice-note lines themselves), so it can land between any two lines of text.
 * Blank lines that were only padding around the old spot go with it.
 */
export function moveVoiceToLine(body: string, voiceId: string, toLine: number): string {
  const lines = body.split('\n');
  const marker = voiceMarker(voiceId);
  const from = lines.indexOf(marker);
  if (from < 0) return body;
  // padding: a lone empty line at the start/end of the doc or hugging another voice note
  const gone = new Set([from]);
  if (from >= 1 && lines[from - 1] === '' && (from === 1 || isMarkerLine(lines[from - 2]))) gone.add(from - 1);
  if (from + 1 < lines.length && lines[from + 1] === '' &&
      (from + 2 === lines.length || isMarkerLine(lines[from + 2]))) gone.add(from + 1);
  const rest = lines.filter((_, i) => !gone.has(i));
  const at = lines.slice(0, Math.max(0, Math.min(toLine, lines.length))).filter((_, i) => !gone.has(i)).length;
  rest.splice(at, 0, marker);
  return serializeBlocks(parseBody(rest.join('\n')));
}
