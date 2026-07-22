/**
 * App-side database bootstrap (expo-sqlite).
 *
 * - `journal.db` lives in the app's private document storage. At rest it is
 *   protected by full-file OS encryption (iOS Data Protection / Android FBE)
 *   plus the app sandbox; see SECURITY.md for the full model.
 * - `web.db` (bundled scripture) ships as an asset and is copied into the
 *   SQLite directory on first launch, opened read-only.
 */
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { migrate } from './migrations';
import { BUNDLED_ID, translationFileName } from '../lib/scripture/translations';
import { seedBuiltinPrompts } from '../repo/prompts';
import type { Sql } from './sql';

/** Adapt expo-sqlite's overloaded API to our narrow Sql interface. */
function wrap(db: SQLite.SQLiteDatabase): Sql {
  return {
    execAsync: (source) => db.execAsync(source),
    runAsync: (source, params = []) => db.runAsync(source, params),
    getAllAsync: (source, params = []) => db.getAllAsync(source, params),
    getFirstAsync: (source, params = []) => db.getFirstAsync(source, params),
  };
}

let journal: Sql | null = null;
const scriptureCache = new Map<string, Sql>();

export async function openJournalDb(): Promise<Sql> {
  if (journal) return journal;
  const db = wrap(await SQLite.openDatabaseAsync('journal.db'));
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await migrate(db);
  await seedBuiltinPrompts(db);
  journal = db;
  return db;
}

/** File name expo-sqlite uses for the bundled translation. */
const BUNDLED_FILE = translationFileName(BUNDLED_ID); // "bible-web.db"

/**
 * Open a translation's SQLite database by id, read-only in effect. The bundled
 * version is copied from the app asset on first use; other versions must have
 * been downloaded already (see lib/scripture/downloads.ts). Opened dbs are
 * cached per id so switching versions is instant on return visits.
 */
export async function openScriptureDb(id: string = BUNDLED_ID): Promise<Sql> {
  const cached = scriptureCache.get(id);
  if (cached) return cached;

  const dir = new Directory(Paths.document, 'SQLite');
  if (!dir.exists) dir.create({ intermediates: true });

  if (id === BUNDLED_ID) {
    const target = new File(dir, BUNDLED_FILE);
    if (!target.exists) {
      const asset = Asset.fromModule(require('@/assets/scripture/web.db'));
      await asset.downloadAsync();
      if (!asset.localUri) throw new Error('scripture asset failed to resolve');
      new File(asset.localUri).copy(target);
    }
  } else if (!new File(dir, translationFileName(id)).exists) {
    throw new Error(`translation ${id} is not downloaded`);
  }

  const db = wrap(await SQLite.openDatabaseAsync(translationFileName(id)));
  scriptureCache.set(id, db);
  return db;
}

/** Test hook / hot-reload guard. */
export function _resetDbCache(): void {
  journal = null;
  scriptureCache.clear();
}
