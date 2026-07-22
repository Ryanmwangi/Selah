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
let scripture: Sql | null = null;

export async function openJournalDb(): Promise<Sql> {
  if (journal) return journal;
  const db = wrap(await SQLite.openDatabaseAsync('journal.db'));
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await migrate(db);
  await seedBuiltinPrompts(db);
  journal = db;
  return db;
}

const SCRIPTURE_DB = 'web.db';

export async function openScriptureDb(): Promise<Sql> {
  if (scripture) return scripture;
  const dir = new Directory(Paths.document, 'SQLite');
  if (!dir.exists) dir.create({ intermediates: true });
  const target = new File(dir, SCRIPTURE_DB);
  if (!target.exists) {
    const asset = Asset.fromModule(require('@/assets/scripture/web.db'));
    await asset.downloadAsync();
    if (!asset.localUri) throw new Error('scripture asset failed to resolve');
    new File(asset.localUri).copy(target);
  }
  scripture = wrap(await SQLite.openDatabaseAsync(SCRIPTURE_DB));
  return scripture;
}

/** Test hook / hot-reload guard. */
export function _resetDbCache(): void {
  journal = null;
  scripture = null;
}
