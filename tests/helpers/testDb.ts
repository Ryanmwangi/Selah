/**
 * better-sqlite3 wrapper satisfying the app's Sql interface, so repository
 * code runs unchanged against real SQLite (with FTS5) in node --test.
 */
import Database from 'better-sqlite3';
import { migrate } from '../../src/db/migrations';
import type { RunResult, Sql, SqlParam } from '../../src/db/sql';

export class TestDb implements Sql {
  readonly raw: Database.Database;

  constructor(file = ':memory:') {
    this.raw = new Database(file);
  }

  async execAsync(source: string): Promise<void> {
    this.raw.exec(source);
  }

  async runAsync(source: string, params: SqlParam[] = []): Promise<RunResult> {
    const info = this.raw.prepare(source).run(...params);
    return { lastInsertRowId: Number(info.lastInsertRowid), changes: info.changes };
  }

  async getAllAsync<T>(source: string, params: SqlParam[] = []): Promise<T[]> {
    return this.raw.prepare(source).all(...params) as T[];
  }

  async getFirstAsync<T>(source: string, params: SqlParam[] = []): Promise<T | null> {
    return (this.raw.prepare(source).get(...params) as T | undefined) ?? null;
  }
}

export async function freshJournalDb(): Promise<TestDb> {
  const db = new TestDb();
  await migrate(db);
  return db;
}

let seq = 0;
export const testId = (): string => `test-id-${++seq}`;
