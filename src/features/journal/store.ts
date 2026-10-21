import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Mood } from '@/theme/tokens';

export type Confidence = 'low' | 'medium' | 'high';
export type Entry = {
  id: string;
  dogId: string;
  kind: 'bark' | 'scan' | 'user';
  mood: Mood;
  intensity?: number;
  confidence?: Confidence;
  text: string; // interpretation or user note
  at: number;
};

type State = {
  entries: Entry[];
  favorites: string[]; // sound ids
  lessons: Record<string, number>; // `${dogId}:${lessonId}` -> completedAt
  quiz: Record<string, number>; // YYYY-MM-DD -> score
  reminder: boolean;
  setReminder: (v: boolean) => void;
  add: (e: Omit<Entry, 'id' | 'at'>) => Entry;
  remove: (id: string) => void;
  clearDog: (dogId: string) => void;
  toggleFavorite: (soundId: string) => void;
  completeLesson: (dogId: string, lessonId: string) => void;
  saveQuiz: (day: string, score: number) => void;
};

export const dayKey = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const useJournal = create<State>()(
  persist(
    (set) => ({
      entries: [],
      favorites: [],
      lessons: {},
      quiz: {},
      reminder: false,
      setReminder: (v) => set({ reminder: v }),
      add: (e) => {
        const entry: Entry = { ...e, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now() };
        set((s) => ({ entries: [entry, ...s.entries] }));
        return entry;
      },
      remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      clearDog: (dogId) => set((s) => ({ entries: s.entries.filter((e) => e.dogId !== dogId) })),
      toggleFavorite: (id) => set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [...s.favorites, id] })),
      completeLesson: (dogId, lessonId) => set((s) => ({ lessons: { ...s.lessons, [`${dogId}:${lessonId}`]: Date.now() } })),
      saveQuiz: (day, score) => set((s) => ({ quiz: { ...s.quiz, [day]: score } })),
    }),
    { name: 'journal-v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Consecutive days ending today (or yesterday) that have at least one timestamp. */
export function streak(times: number[]): number {
  const days = new Set(times.map((t) => dayKey(t)));
  let n = 0;
  const d = new Date();
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d.getTime()))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
