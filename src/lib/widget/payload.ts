/**
 * The widget payload: a tiny, self-contained snapshot the home/lock-screen
 * widgets render. It is written to shared native storage (iOS App Group,
 * Android widget state) so the widget process, which cannot open the app's
 * SQLite or run JS, has everything it needs as plain strings.
 *
 * Kept deliberately small and pure so it is fully unit-testable and cheap to
 * serialize. No secrets ever go here (see SECURITY.md): a widget is visible on
 * a locked screen, so only content the user explicitly chose to surface.
 */

export type WidgetKind = 'dailyVerse' | 'pinnedVerse' | 'note' | 'streak';

export const WIDGET_KINDS: Array<{ kind: WidgetKind; label: string; blurb: string }> = [
  { kind: 'dailyVerse', label: 'Verse of the day', blurb: 'A fresh passage each morning.' },
  { kind: 'pinnedVerse', label: 'A verse to keep', blurb: 'Hold one passage in view.' },
  { kind: 'note', label: 'A note to yourself', blurb: 'Leave a line where you’ll see it.' },
  { kind: 'streak', label: 'Your rhythm', blurb: 'Days journaled and your streak.' },
];

export interface WidgetPayload {
  kind: WidgetKind;
  /** Small overline, e.g. "Selah" or "Psalm 46:10". */
  eyebrow: string;
  /** The main line(s): verse text, the note, or the streak headline. */
  body: string;
  /** Optional footer: reference, translation, or a soft nudge. */
  footer: string;
  /** For lock-screen accessory widgets that only fit a word or number. */
  accessoryShort: string;
  /** ms epoch — lets the widget show "updated" and drives dedupe. */
  updatedAt: number;
}

export interface PayloadInputs {
  kind: WidgetKind;
  now: number;
  verseRefLabel?: string; // "Psalm 46:10"
  verseText?: string;
  note?: string;
  daysJournaled?: number;
  currentStreak?: number;
}

const clampBody = (s: string, max = 240): string =>
  s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;

/** Pure: turn chosen content into the exact strings the widgets show. */
export function buildWidgetPayload(i: PayloadInputs): WidgetPayload {
  switch (i.kind) {
    case 'note': {
      const note = (i.note ?? '').trim();
      return {
        kind: 'note',
        eyebrow: 'A note to yourself',
        body: note ? clampBody(note) : 'Tap to leave yourself a word.',
        footer: 'Selah',
        accessoryShort: note ? clampBody(note, 40) : 'Selah',
        updatedAt: i.now,
      };
    }
    case 'streak': {
      const days = i.daysJournaled ?? 0;
      const streak = i.currentStreak ?? 0;
      const headline =
        streak > 0
          ? `${streak}-day streak`
          : days > 0
            ? 'Begin again today'
            : 'Your first pause awaits';
      return {
        kind: 'streak',
        eyebrow: 'Your rhythm',
        body: headline,
        footer: `${days} ${days === 1 ? 'day' : 'days'} journaled`,
        accessoryShort: streak > 0 ? `${streak}d` : '—',
        updatedAt: i.now,
      };
    }
    case 'pinnedVerse':
    case 'dailyVerse': {
      const text = (i.verseText ?? '').trim();
      const ref = i.verseRefLabel ?? '';
      return {
        kind: i.kind,
        eyebrow: ref || 'Scripture',
        body: text ? clampBody(`“${text}”`) : 'Open Selah to choose a verse.',
        footer: ref ? `${ref} · WEB` : 'Selah',
        accessoryShort: ref || 'Selah',
        updatedAt: i.now,
      };
    }
  }
}

/** Stable JSON for the shared store; omits nothing the widget reads. */
export function serializeWidgetPayload(p: WidgetPayload): string {
  return JSON.stringify(p);
}

export function parseWidgetPayload(raw: string | null | undefined): WidgetPayload | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as WidgetPayload;
    if (typeof p?.body !== 'string' || typeof p?.kind !== 'string') return null;
    return p;
  } catch {
    return null;
  }
}
