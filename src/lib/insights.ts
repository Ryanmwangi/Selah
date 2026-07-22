/**
 * The insights engine, pure functions over entry timestamps/bodies, so the
 * whole dashboard is unit-testable without a device.
 *
 * All day math is done on local-time "day keys" (yyyy-MM-dd) supplied by the
 * caller, so time zones behave the way a human journaling at 23:50 expects.
 */

/** Local-time day key. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  return dayKey(date.getTime());
}

export interface Streaks {
  current: number;
  longest: number;
}

/**
 * Streaks over the set of journaled days.
 * The current streak is counted ending today OR yesterday, an unbroken
 * chain isn't "lost" until a full day has actually been missed.
 */
export function computeStreaks(journaledDays: Iterable<string>, today: string): Streaks {
  const days = new Set(journaledDays);
  if (days.size === 0) return { current: 0, longest: 0 };

  // longest: walk each chain start
  let longest = 0;
  for (const d of days) {
    if (days.has(shiftDay(d, -1))) continue; // not a chain start
    let len = 1;
    let cur = d;
    while (days.has(shiftDay(cur, 1))) {
      cur = shiftDay(cur, 1);
      len++;
    }
    if (len > longest) longest = len;
  }

  // current: anchor at today, or yesterday if today hasn't been written yet
  let anchor: string | null = null;
  if (days.has(today)) anchor = today;
  else if (days.has(shiftDay(today, -1))) anchor = shiftDay(today, -1);
  let current = 0;
  while (anchor && days.has(anchor)) {
    current++;
    anchor = shiftDay(anchor, -1);
  }
  return { current, longest };
}

/** Word count of a markdown body (formatting stripped enough for counting). */
export function wordCount(body: string): number {
  // \p{M} keeps combining marks (e.g. Hebrew niqqud) from splitting a word
  const words = body.replace(/[#*>\-]/g, ' ').match(/[\p{L}\p{M}\p{N}'’]+/gu);
  return words ? words.length : 0;
}

/** Days journaled in the local week containing `today` (week starts Monday). */
export function weekProgress(journaledDays: Iterable<string>, today: string): { done: number; weekDays: string[] } {
  const [y, m, d] = today.split('-').map(Number);
  const t = new Date(y, m - 1, d);
  const dow = (t.getDay() + 6) % 7; // Mon=0
  const monday = shiftDay(today, -dow);
  const weekDays = Array.from({ length: 7 }, (_, i) => shiftDay(monday, i));
  const days = new Set(journaledDays);
  return { done: weekDays.filter((k) => days.has(k)).length, weekDays };
}

export interface MonthCell {
  key: string; // yyyy-MM-dd
  day: number;
  inMonth: boolean;
}

/** A month laid out as weeks (Mon-first), padded with out-of-month cells. */
export function monthGrid(year: number, month0: number): MonthCell[][] {
  const first = new Date(year, month0, 1);
  const start = new Date(year, month0, 1 - ((first.getDay() + 6) % 7));
  const weeks: MonthCell[][] = [];
  const cursor = new Date(start);
  do {
    const week: MonthCell[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({
        key: dayKey(cursor.getTime()),
        day: cursor.getDate(),
        inMonth: cursor.getMonth() === month0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getMonth() === month0);
  return weeks;
}

/** Count occurrences, return top-N [name, count] sorted desc then alpha. */
export function topCounts(items: Iterable<string>, n: number): Array<[string, number]> {
  const map = new Map<string, number>();
  for (const it of items) map.set(it, (map.get(it) ?? 0) + 1);
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n);
}
