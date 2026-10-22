// Data-driven, reward-based lessons. Add lessons here (or load from the backend later) — no screen changes needed.
// Ids are stored with completed progress, so never rename an existing id. Text lives per language in ./lessons.
import i18n from '@/localization';
import { de } from './lessons/de';
import { en } from './lessons/en';
import { es } from './lessons/es';
import { fr } from './lessons/fr';
import { pt } from './lessons/pt';

export type Level = 'beginner' | 'intermediate' | 'advanced';
export type LessonText = { title: string; summary: string; goal: string; steps: string[]; tips: string[]; mistakes: string[] };
export type LessonMeta = { id: string; emoji: string; level: Level; minutes: number; pro?: boolean };
export type Lesson = LessonMeta & LessonText;

export const LEVELS: Level[] = ['beginner', 'intermediate', 'advanced'];

const META: LessonMeta[] = [
  { id: 'name', emoji: '👋', level: 'beginner', minutes: 3 },
  { id: 'sit', emoji: '🐕', level: 'beginner', minutes: 5 },
  { id: 'down', emoji: '🛏️', level: 'beginner', minutes: 5 },
  { id: 'paw', emoji: '🐾', level: 'beginner', minutes: 4 },
  { id: 'stay', emoji: '✋', level: 'beginner', minutes: 5 },
  { id: 'potty', emoji: '🚽', level: 'beginner', minutes: 10 },
  { id: 'come', emoji: '🦴', level: 'intermediate', minutes: 5, pro: true },
  { id: 'leaveIt', emoji: '🚫', level: 'intermediate', minutes: 5, pro: true },
  { id: 'dropIt', emoji: '🎾', level: 'intermediate', minutes: 5, pro: true },
  { id: 'leash', emoji: '🦮', level: 'intermediate', minutes: 10, pro: true },
  { id: 'door', emoji: '🚪', level: 'intermediate', minutes: 5, pro: true },
  { id: 'place', emoji: '🛋️', level: 'intermediate', minutes: 6, pro: true },
  { id: 'recall', emoji: '🎯', level: 'advanced', minutes: 10, pro: true },
  { id: 'quiet', emoji: '🤫', level: 'advanced', minutes: 6, pro: true },
  { id: 'rollOver', emoji: '🔄', level: 'advanced', minutes: 5, pro: true },
  { id: 'settle', emoji: '🧘', level: 'advanced', minutes: 8, pro: true },
];

const TEXT: Record<string, Record<string, LessonText>> = { en, es, fr, de, pt };

/** Lessons in the given language (the app's current one by default), falling back to English per lesson. */
export function lessons(lang = i18n.language): Lesson[] {
  const t = TEXT[lang] ?? en;
  return META.map((m) => ({ ...m, ...(t[m.id] ?? en[m.id]) }));
}
