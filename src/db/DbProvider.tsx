import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Sql } from './sql';
import { openJournalDb, openScriptureDb } from './client';
import { deletePhotoFile } from '../lib/photos';
import { purgeExpiredDeleted, TRASH_RETENTION_MS } from '../repo/entries';
import { refreshWidget } from '../repo/widget';
import { useAppStore } from '../state/appStore';
import { useLockStore } from '../state/lockStore';

interface Dbs {
  journal: Sql;
  scripture: Sql;
}

const DbContext = createContext<Dbs | null>(null);

export function DbProvider({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const [dbs, setDbs] = useState<Dbs | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [journal, scripture] = await Promise.all([openJournalDb(), openScriptureDb()]);
      await Promise.all([useAppStore.getState().hydrate(journal), useLockStore.getState().init()]);
      // sweep Recently Deleted: entries past retention purge forever, photos too
      try {
        const files = await purgeExpiredDeleted(journal, Date.now() - TRASH_RETENTION_MS);
        for (const f of files) deletePhotoFile(f);
      } catch {
        // a failed sweep never blocks the journal from opening
      }
      // refresh widgets on launch so the daily verse / streak stay current
      void refreshWidget(journal, scripture, Date.now()).catch(() => {});
      if (!cancelled) setDbs({ journal, scripture });
    })().catch((e: Error) => !cancelled && setError(e));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) throw error;
  if (!dbs) return <>{fallback}</>;
  return <DbContext.Provider value={dbs}>{children}</DbContext.Provider>;
}

export function useDb(): Dbs {
  const dbs = useContext(DbContext);
  if (!dbs) throw new Error('useDb outside DbProvider');
  return dbs;
}
