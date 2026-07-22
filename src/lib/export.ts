import { formatRef } from './scripture/refs';
import { linkToRef } from '../repo/verseLinks';
import type { EntryWithMeta } from '../repo/types';

/**
 * Export the whole journal as Markdown, users own their words.
 * Pure function; the settings screen writes/share-sheets the result.
 */
export function exportMarkdown(entries: EntryWithMeta[], now: Date): string {
  const lines: string[] = [
    '# Selah Journal Export',
    '',
    `Exported ${now.toISOString().slice(0, 10)} · ${entries.length} entries`,
    '',
  ];
  for (const e of [...entries].sort((a, b) => a.created_at - b.created_at)) {
    const d = new Date(e.created_at);
    lines.push('---', '');
    lines.push(`## ${e.title?.trim() || d.toDateString()}`);
    lines.push('');
    const meta: string[] = [d.toISOString()];
    if (e.moods.length) meta.push(`mood: ${e.moods.join(', ')}`);
    if (e.place_name) meta.push(`at ${e.place_name}`);
    if (e.tags.length) meta.push(`tags: ${e.tags.map((t) => t.name).join(', ')}`);
    if (e.verseLinks.length) meta.push(e.verseLinks.map((l) => formatRef(linkToRef(l))).join('; '));
    if (e.attachments.length) meta.push(`${e.attachments.length} photo${e.attachments.length > 1 ? 's' : ''}`);
    lines.push(`*${meta.join(' · ')}*`, '');
    lines.push(e.body.trim(), '');
  }
  return lines.join('\n');
}
