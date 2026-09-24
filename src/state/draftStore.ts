/**
 * Composer draft state. Lives in a store (not component state) so the
 * verse-picker modal and photo/location actions contribute to one draft.
 */
import { create } from 'zustand';
import type { VerseRef } from '../lib/scripture/refs';

export interface DraftVerse {
  key: string;
  ref: VerseRef;
}

export interface DraftPhoto {
  id: string;
  filename: string;
  width: number | null;
  height: number | null;
  /** true once it's persisted as an attachment row */
  saved: boolean;
}

export interface DraftVoice {
  id: string;
  filename: string;
  durationMs: number;
  label: string | null;
  saved: boolean;
}

export interface DraftPlace {
  placeName: string;
  latitude: number;
  longitude: number;
}

interface DraftState {
  entryId: string | null;
  title: string;
  body: string;
  moods: string[];
  verses: DraftVerse[];
  tagNames: string[];
  photos: DraftPhoto[];
  voices: DraftVoice[];
  place: DraftPlace | null;
  dirty: boolean;
  start(partial?: Partial<Omit<DraftState, 'dirty'>>): void;
  patch(p: Partial<Pick<DraftState, 'title' | 'body'>>): void;
  setEntryId(id: string): void;
  toggleMood(mood: string): void;
  addVerse(v: DraftVerse): void;
  removeVerse(key: string): void;
  addTag(name: string): void;
  removeTag(name: string): void;
  addPhotos(photos: DraftPhoto[]): void;
  removePhoto(id: string): void;
  addVoice(v: DraftVoice): void;
  removeVoice(id: string): void;
  renameVoice(id: string, label: string): void;
  setPlace(place: DraftPlace | null): void;
  clear(): void;
}

const EMPTY = {
  entryId: null, title: '', body: '', moods: [] as string[],
  verses: [] as DraftVerse[], tagNames: [] as string[],
  photos: [] as DraftPhoto[], voices: [] as DraftVoice[], place: null as DraftPlace | null, dirty: false,
};

export const useDraftStore = create<DraftState>((set) => ({
  ...EMPTY,
  start: (partial) => set({ ...EMPTY, ...partial }),
  patch: (p) => set((s) => ({ ...s, ...p, dirty: true })),
  setEntryId: (id) => set({ entryId: id }),
  toggleMood: (mood) =>
    set((s) => ({
      moods: s.moods.includes(mood) ? s.moods.filter((m) => m !== mood) : [...s.moods, mood],
      dirty: true,
    })),
  addVerse: (v) => set((s) => ({ verses: [...s.verses, v], dirty: true })),
  removeVerse: (key) => set((s) => ({ verses: s.verses.filter((x) => x.key !== key), dirty: true })),
  addTag: (name) =>
    set((s) => {
      const n = name.trim();
      if (!n || s.tagNames.some((t) => t.toLowerCase() === n.toLowerCase())) return s;
      return { ...s, tagNames: [...s.tagNames, n], dirty: true };
    }),
  removeTag: (name) => set((s) => ({ tagNames: s.tagNames.filter((t) => t !== name), dirty: true })),
  addPhotos: (photos) => set((s) => ({ photos: [...s.photos, ...photos], dirty: true })),
  removePhoto: (id) => set((s) => ({ photos: s.photos.filter((p) => p.id !== id), dirty: true })),
  addVoice: (v) => set((s) => ({ voices: [...s.voices, v], dirty: true })),
  removeVoice: (id) => set((s) => ({ voices: s.voices.filter((v) => v.id !== id), dirty: true })),
  renameVoice: (id, label) =>
    set((s) => ({ voices: s.voices.map((v) => (v.id === id ? { ...v, label: label.trim() || null } : v)), dirty: true })),
  setPlace: (place) => set({ place, dirty: true }),
  clear: () => set({ ...EMPTY }),
}));
