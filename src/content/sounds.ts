// Sound metadata is separate from playback. Add licensed audio files to assets/sounds and list them here.
// Not shipped: no licensed dog-sound assets exist in this repo yet, and files must never be duplicated to pad the count.
export type SoundCategory = 'barks' | 'whines' | 'growls' | 'howls' | 'playful' | 'attention' | 'squeaky' | 'doorbell' | 'training';
export type Sound = {
  id: string;
  title: string;
  category: SoundCategory;
  source: number; // require('../../assets/sounds/xyz.mp3')
  license: string; // e.g. "CC0 – freesound.org/s/123"
  attribution?: string;
  pro?: boolean;
};

export const SOUNDS: Sound[] = [];

// Phrase -> sound per dog size. Same rule: only real, licensed assets.
export type Phrase = 'come' | 'sit' | 'stay' | 'goodDog' | 'play' | 'outside';
export const PHRASES: Phrase[] = ['come', 'sit', 'stay', 'goodDog', 'play', 'outside'];
export const PHRASE_SOUNDS: Partial<Record<Phrase, Partial<Record<'small' | 'medium' | 'big', number>>>> = {};
