import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type DogSize = 'small' | 'medium' | 'big';
export type AgeGroup = 'puppy' | 'adult' | 'senior';
export type DogSex = 'male' | 'female';
export type AgeRange = 'under1' | '1to2' | '3to6' | '7to10' | '11plus';

export const AGE_RANGES: AgeRange[] = ['under1', '1to2', '3to6', '7to10', '11plus'];
// The coarse age group is still what the assistant and the database schema use.
export const ageGroupFor = (r: AgeRange): AgeGroup => (r === 'under1' ? 'puppy' : r === '1to2' || r === '3to6' ? 'adult' : 'senior');

export type Dog = {
  id: string;
  name: string;
  breed?: string;
  sex?: DogSex;
  age?: AgeGroup;
  ageRange?: AgeRange;
  voice: DogSize;
  photoUri?: string;
  traits: string[];
  createdAt: number;
};

export const FREE_DOG_LIMIT = 1; // multiple profiles are a Pro feature (enforced here and, later, server-side)

type State = {
  dogs: Dog[];
  activeDogId?: string;
  onboarded: boolean;
  addDog: (d: Omit<Dog, 'id' | 'createdAt'>) => Dog;
  updateDog: (id: string, patch: Partial<Omit<Dog, 'id' | 'createdAt'>>) => void;
  removeDog: (id: string) => void;
  setActive: (id: string) => void;
  finishOnboarding: () => void;
};

export const useDogs = create<State>()(
  persist(
    (set, get) => ({
      dogs: [],
      onboarded: false,
      addDog: (d) => {
        const dog: Dog = { ...d, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now() };
        set((s) => ({ dogs: [...s.dogs, dog], activeDogId: s.activeDogId ?? dog.id }));
        return dog;
      },
      updateDog: (id, patch) => set((s) => ({ dogs: s.dogs.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      removeDog: (id) =>
        set((s) => {
          const dogs = s.dogs.filter((d) => d.id !== id);
          return { dogs, activeDogId: s.activeDogId === id ? dogs[0]?.id : s.activeDogId };
        }),
      setActive: (id) => get().dogs.some((d) => d.id === id) && set({ activeDogId: id }),
      finishOnboarding: () => set({ onboarded: true }),
    }),
    { name: 'dogs-v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export const useActiveDog = () => useDogs((s) => s.dogs.find((d) => d.id === s.activeDogId));
