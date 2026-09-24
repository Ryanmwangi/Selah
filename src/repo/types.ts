export interface Entry {
  id: string;
  title: string | null;
  body: string;
  /** @deprecated v1 single mood, superseded by entry_moods; kept for migration */
  mood: string | null;
  created_at: number;
  updated_at: number;
  is_pinned: number;
  is_archived: number;
  place_name: string | null;
  latitude: number | null;
  longitude: number | null;
  /** set when the entry sits in Recently Deleted; purged after RETENTION */
  deleted_at: number | null;
}

export interface Attachment {
  id: string;
  entry_id: string;
  type: string;
  filename: string;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  created_at: number;
}

export interface VerseLink {
  id: string;
  entry_id: string;
  book: number;
  chapter: number;
  verse_start: number;
  verse_end: number | null;
  translation: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export interface Prompt {
  id: string;
  text: string;
  category: string;
  is_builtin: number;
}

/** Entry decorated for list rendering. */
export interface EntryWithMeta extends Entry {
  verseLinks: VerseLink[];
  tags: Tag[];
  moods: string[];
  attachments: Attachment[];
}

export const MOODS = [
  'still', 'grateful', 'hopeful', 'rejoicing', 'peaceful', 'content',
  'anxious', 'afraid', 'weary', 'lonely', 'heavy', 'discouraged',
  'wrestling', 'angry', 'tempted',
] as const;
export type Mood = (typeof MOODS)[number];
