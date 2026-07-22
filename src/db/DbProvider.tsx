import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Sql } from './sql';
import { openJournalDb, openScriptureDb } from './client';
import { deletePhotoFile } from '../lib/photos';
import { BUNDLED_ID } from '../lib/scripture/translations';
import { purgeExpiredDeleted, TRASH_RETENTION_MS } from '../repo/entries';
import { effectiveTranslationId } from '../repo/translations';
import { refreshWidget } from '../repo/widget';
import { useAppStore } from '../state/appStore';
import { useLockStore } from '../state/lockStore';

interface Dbs {
  journal: Sql;
  /** The active translation's database (chosen version, or bundled fallback). */
  scripture: Sql;
  /** Id of the translation `scripture` points at. */
  scriptureId: string;
  /** Re-resolve the active translation and swap `scripture` (call after switching/downloading). */
  refreshScripture: () => Promise<void>;
}

const DbContext = createContext<Dbs | null>(null);

export function DbProvider({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const [journal, setJournal] = useState<Sql | null>(null);
  const [scripture, setScripture] = useState<Sql | null>(null);
  const [scriptureId, setScriptureId] = useState<string>(BUNDLED_ID);
  const [error, setError] = useState<Error | null>(null);

  const refreshScripture = useCallback(async () => {
    if (!journal) return;
    const id = await effectiveTranslationId(journal);
    if (id === scriptureId && scripture) return;
    const db = await openScriptureDb(id);
    setScripture(db);
    setScriptureId(id);
  }, [journal, scriptureId, scripture]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const j = await openJournalDb();
      const id = await effectiveTranslationId(j);
      const s = await openScriptureDb(id);
      await Promise.all([useAppStore.getState().hydrate(j), useLockStore.getState().init()]);
      try {
        const files = await purgeExpiredDeleted(j, Date.now() - TRASH_RETENTION_MS);
        for (const f of files) deletePhotoFile(f);
      } catch {
        // a failed sweep never blocks the journal from opening
      }
      void refreshWidget(j, s, Date.now()).catch(() => {});
      if (!cancelled) {
        setJournal(j);
        setScripture(s);
        setScriptureId(id);
      }
    })().catch((e: Error) => !cancelled && setError(e));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) throw error;
  if (!journal || !scripture) return <>{fallback}</>;
  return (
    <DbContext.Provider value={{ journal, scripture, scriptureId, refreshScripture }}>
      {children}
    </DbContext.Provider>
  );
}

export function useDb(): Dbs {
  const dbs = useContext(DbContext);
  if (!dbs) throw new Error('useDb outside DbProvider');
  return dbs;
}
