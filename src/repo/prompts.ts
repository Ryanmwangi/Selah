import type { Sql } from '../db/sql';
import type { Prompt } from './types';

/**
 * Built-in reflection prompt library. Seeded once (INSERT OR IGNORE by
 * stable id) so user edits/deletions of their own prompts are never clobbered.
 */
export const BUILTIN_PROMPTS: Array<{ id: string; text: string; category: string }> = [
  // gratitude
  { id: 'bp-grat-1', text: 'Name three things from today you don’t want to forget to thank God for.', category: 'gratitude' },
  { id: 'bp-grat-2', text: 'Where did you see an answered prayer this week, even a small one?', category: 'gratitude' },
  { id: 'bp-grat-3', text: 'Who has been grace to you lately? Write about them.', category: 'gratitude' },
  // presence
  { id: 'bp-pres-1', text: 'Where did you see God today?', category: 'presence' },
  { id: 'bp-pres-2', text: 'What moment today deserved a pause you didn’t give it? Give it that pause now.', category: 'presence' },
  { id: 'bp-pres-3', text: 'If this season had a name, what would it be, and why?', category: 'presence' },
  // confession
  { id: 'bp-conf-1', text: 'What are you carrying that you haven’t said out loud to God yet?', category: 'confession' },
  { id: 'bp-conf-2', text: 'Where did you choose fear over faith this week? Write honestly; this page is private.', category: 'confession' },
  // scripture
  { id: 'bp-scr-1', text: 'Read the verse slowly three times. Which word stops you? Start there.', category: 'scripture' },
  { id: 'bp-scr-2', text: 'Rewrite this passage in your own words, as if writing it to yourself.', category: 'scripture' },
  { id: 'bp-scr-3', text: 'What would change tomorrow if you fully believed this verse?', category: 'scripture' },
  // petition
  { id: 'bp-pet-1', text: 'What are you asking God for right now? Date it. Future-you will want to look back.', category: 'petition' },
  { id: 'bp-pet-2', text: 'Write a prayer for someone who will never know you prayed it.', category: 'petition' },
  // rest
  { id: 'bp-rest-1', text: 'What do you need to lay down before you sleep tonight?', category: 'rest' },
  { id: 'bp-rest-2', text: 'Be still. Set a timer for two minutes, then write only what surfaced.', category: 'rest' },
];

export async function seedBuiltinPrompts(db: Sql): Promise<void> {
  for (const p of BUILTIN_PROMPTS) {
    await db.runAsync(`INSERT OR IGNORE INTO prompts (id, text, category, is_builtin) VALUES (?, ?, ?, 1)`, [
      p.id, p.text, p.category,
    ]);
  }
}

export async function listPrompts(db: Sql, category?: string): Promise<Prompt[]> {
  return category
    ? db.getAllAsync<Prompt>(`SELECT * FROM prompts WHERE category = ? ORDER BY rowid`, [category])
    : db.getAllAsync<Prompt>(`SELECT * FROM prompts ORDER BY category, rowid`);
}

export async function listPromptCategories(db: Sql): Promise<string[]> {
  const rows = await db.getAllAsync<{ category: string }>(`SELECT DISTINCT category FROM prompts ORDER BY category`);
  return rows.map((r) => r.category);
}

/** Deterministic "prompt of the moment": stable for a given day, varied across days. */
export function pickDailyPrompt(prompts: Prompt[], dayKey: string): Prompt | null {
  if (prompts.length === 0) return null;
  let h = 2166136261;
  for (let i = 0; i < dayKey.length; i++) {
    h ^= dayKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return prompts[(h >>> 0) % prompts.length];
}
