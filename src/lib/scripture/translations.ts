/**
 * Bible translation registry.
 *
 * The app ships exactly one translation, a public-domain one, so the download
 * stays small and scripture works offline immediately. Every other version is
 * fetched on demand into local storage and read fully offline afterwards.
 *
 * Launch scope is public-domain / freely licensed versions only, no
 * copyrighted translation (NKJV, ESV, NIV, ...) is listed or downloadable.
 * See CLAUDE.md: only distribute text we have the right to distribute. A
 * licensed version can be added later by appending a row with
 * `distributable: false` and a licensed download source.
 */
export interface Translation {
  id: string; // stable, uppercase, also the remote file stem
  name: string;
  abbrev: string;
  license: string;
  /** May we distribute the text? Gates whether a download source is allowed. */
  distributable: boolean;
  /** Ships inside the app binary (there is exactly one). */
  bundled: boolean;
  approxBytes: number;
}

/** Ships in the app; always available, the offline fallback. */
export const BUNDLED_ID = 'WEB';

/** The user's preferred default. Effective version falls back to bundled until installed. */
export const DEFAULT_ID = BUNDLED_ID;

export const TRANSLATIONS: Translation[] = [
  {
    id: 'WEB', name: 'World English Bible', abbrev: 'WEB',
    license: 'Public domain', distributable: true, bundled: true, approxBytes: 4_505_600,
  },
  {
    id: 'KJV', name: 'King James Version', abbrev: 'KJV',
    license: 'Public domain', distributable: true, bundled: false, approxBytes: 4_400_000,
  },
  {
    id: 'ASV', name: 'American Standard Version', abbrev: 'ASV',
    license: 'Public domain', distributable: true, bundled: false, approxBytes: 4_450_000,
  },
  {
    id: 'BSB', name: 'Berean Standard Bible', abbrev: 'BSB',
    license: 'Freely licensed, attribution', distributable: true, bundled: false, approxBytes: 4_600_000,
  },
];

export function getTranslation(id: string): Translation | undefined {
  return TRANSLATIONS.find((tr) => tr.id === id);
}

export function translationAbbrev(id: string): string {
  return getTranslation(id)?.abbrev ?? id;
}

/** Local + remote filename stem for a translation's SQLite database. */
export function translationFileName(id: string): string {
  return `bible-${id.toLowerCase()}.db`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
