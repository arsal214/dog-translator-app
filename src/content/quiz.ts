// Curated, conservative dog facts. Review before adding; avoid medical claims.
export type Q = { q: string; options: string[]; answer: number; why: string };

export const QUESTIONS: Q[] = [
  { q: 'Which is generally a more effective way to teach a new behaviour?', options: ['Rewarding what you want', 'Punishing mistakes', 'Ignoring training'], answer: 0, why: 'Reward-based training builds trust and is widely recommended by behaviour professionals.' },
  { q: 'A wagging tail always means a dog is happy.', options: ['True', 'False'], answer: 1, why: 'Tail wags show arousal. Speed, height and body posture matter for the mood.' },
  { q: 'Which chocolate-related fact is correct?', options: ['Chocolate is toxic to dogs', 'Chocolate is a safe treat', 'Only white chocolate is toxic'], answer: 0, why: 'Chocolate contains theobromine, which is toxic to dogs. Call a vet if a dog eats some.' },
  { q: 'Roughly how often should adult dogs get a chance to go outside to relieve themselves?', options: ['Once a week', 'Several times a day', 'Only when sick'], answer: 1, why: 'Most adult dogs need several toilet breaks every day.' },
  { q: 'Which is a common sign a dog may be stressed?', options: ['Lip licking and yawning out of context', 'Relaxed, loose body', 'Rolling over for a belly rub'], answer: 0, why: 'Lip licking, yawning and turning away can be calming or stress signals.' },
  { q: 'How long should early training sessions usually be?', options: ['A few minutes', 'Two hours', 'All day'], answer: 0, why: 'Short, upbeat sessions keep dogs motivated and prevent frustration.' },
];

export const DAILY_FACTS: string[] = [
  'Dogs can learn the meaning of many words, but they rely heavily on tone and body language too.',
  'A dog’s sense of smell is far more sensitive than ours, which is why sniffing walks are great enrichment.',
  'Puppies need lots of sleep — often 18 hours or more a day — to grow and learn.',
  'Short, frequent training sessions usually work better than one long session.',
  'Fresh water should always be available to your dog.',
];
