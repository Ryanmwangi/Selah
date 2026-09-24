import { formatDuration } from './duration';
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
    const photos = e.attachments.filter((a) => a.type !== 'audio').length;
    const voice = e.attachments.length - photos;
    if (photos) meta.push(`${photos} photo${photos > 1 ? 's' : ''}`);
    if (voice) meta.push(`${voice} voice note${voice > 1 ? 's' : ''}`);
    lines.push(`*${meta.join(' · ')}*`, '');
    // voice notes stay where the author placed them, as a labelled line
    const body = e.body.replace(/^\[\[voice:([A-Za-z0-9_-]+)\]\]$/gm, (_m, id: string) => {
      const a = e.attachments.find((x) => x.id === id);
      const name = a?.label?.trim() || 'Voice note';
      return `*[${name}${a?.duration_ms ? `, ${formatDuration(a.duration_ms)}` : ''}]*`;
    });
    lines.push(body.trim(), '');
  }
  return lines.join('\n');
}
