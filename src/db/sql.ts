/**
 * Minimal async SQL interface.
 *
 * expo-sqlite's SQLiteDatabase satisfies this structurally in the app;
 * tests satisfy it with a thin better-sqlite3 wrapper, so every query in
 * the repositories runs against real SQLite (with FTS5) under `node --test`.
 */
export type SqlParam = string | number | null | Uint8Array;

export interface RunResult {
  lastInsertRowId: number;
  changes: number;
}

export interface Sql {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params?: SqlParam[]): Promise<RunResult>;
  getAllAsync<T>(source: string, params?: SqlParam[]): Promise<T[]>;
  getFirstAsync<T>(source: string, params?: SqlParam[]): Promise<T | null>;
}
