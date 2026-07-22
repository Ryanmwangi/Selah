import type { Sql } from '../db/sql';
import { isTranslationInstalled } from '../lib/scripture/downloads';
import { BUNDLED_ID, DEFAULT_ID } from '../lib/scripture/translations';
import { getSetting, setSetting } from './settings';

/** The user's chosen version (a preference), defaulting to DEFAULT_ID. */
export async function getActiveTranslationId(db: Sql): Promise<string> {
  return (await getSetting(db, 'active_translation')) ?? DEFAULT_ID;
}

export async function setActiveTranslationId(db: Sql, id: string): Promise<void> {
  await setSetting(db, 'active_translation', id);
}

/**
 * The version actually used to render scripture: the chosen one if it is
 * installed, otherwise the bundled public-domain fallback, so the app always
 * has something to read even before a preferred (e.g. licensed) version is
 * downloaded.
 */
export async function effectiveTranslationId(db: Sql): Promise<string> {
  const chosen = await getActiveTranslationId(db);
  return isTranslationInstalled(chosen) ? chosen : BUNDLED_ID;
}
