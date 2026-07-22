/**
 * Download and manage translation databases (native; uses expo-file-system).
 *
 * Files land in the same SQLite directory expo-sqlite opens from, named
 * bible-<id>.db, so a downloaded translation can be opened by name just like
 * the bundled one. The download source is configured by the operator via
 * app.json > expo.extra.bibleBaseUrl and must serve a Selah-schema database
 * (books + verses + meta, as produced by scripts/build-scripture-db.mjs).
 */
import Constants from 'expo-constants';
import { Directory, File, Paths } from 'expo-file-system';
import { BUNDLED_ID, getTranslation, translationFileName } from './translations';

function sqliteDir(): Directory {
  const dir = new Directory(Paths.document, 'SQLite');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Base URL for hosted translation DBs, or '' when none is configured. */
export function translationBaseUrl(): string {
  const raw = (Constants.expoConfig?.extra as { bibleBaseUrl?: string } | undefined)?.bibleBaseUrl;
  return (raw ?? '').replace(/\/+$/, '');
}

/** The remote URL for a translation, or null when it cannot be offered. */
export function downloadUrl(id: string): string | null {
  const tr = getTranslation(id);
  if (!tr || tr.bundled || !tr.distributable) return null;
  const base = translationBaseUrl();
  return base ? `${base}/${translationFileName(id)}` : null;
}

export function isTranslationInstalled(id: string): boolean {
  if (id === BUNDLED_ID) return true;
  return new File(sqliteDir(), translationFileName(id)).exists;
}

/** Download a translation into local storage for offline reading. */
export async function downloadTranslation(id: string): Promise<void> {
  const url = downloadUrl(id);
  if (!url) throw new Error('This version has no download source configured.');
  const dest = new File(sqliteDir(), translationFileName(id));
  if (dest.exists) dest.delete();
  await File.downloadFileAsync(url, dest);
  if (!dest.exists) throw new Error('Download did not complete.');
}

/** Delete a downloaded translation to reclaim space (bundled one is kept). */
export function removeTranslation(id: string): void {
  if (id === BUNDLED_ID) return;
  const f = new File(sqliteDir(), translationFileName(id));
  if (f.exists) f.delete();
}
