// Data-driven, reward-based lessons. Add lessons here (or load from the backend later) — no screen changes needed.
export type Lesson = { id: string; title: string; summary: string; pro?: boolean; steps: string[] };

export const LESSONS: Lesson[] = [
  {
    id: 'sit', title: 'Sit', summary: 'The foundation for almost everything else.',
    steps: [
      'Get small, soft treats ready and pick a quiet spot with few distractions.',
      'Hold a treat at your dog’s nose, then slowly move it up and back over their head.',
      'As their bottom lowers into a sit, say “Sit” and give the treat straight away.',
      'Repeat 5 times, then take a short break. Keep sessions under 5 minutes.',
      'Once they sit reliably, say “Sit” just before you lure, then fade the lure.',
    ],
  },
  {
    id: 'stay', title: 'Stay', summary: 'Build calm self-control, one second at a time.',
    steps: [
      'Ask for a Sit. Show your open palm and say “Stay”.',
      'Wait one second, then reward while they are still sitting.',
      'Add time slowly: 2, 3, 5 seconds. If they move, simply reset — no scolding.',
      'Only then add distance, one small step at a time.',
      'Release with a clear word such as “Okay!” so they know when it’s over.',
    ],
  },
  {
    id: 'paw', title: 'Paw', summary: 'A fun trick that builds focus and confidence.',
    steps: [
      'Ask for a Sit and hold a treat in a closed fist near their paw.',
      'The moment they lift or touch your hand with a paw, say “Yes!” and reward.',
      'When it’s reliable, add the cue “Paw” and hold out your open hand.',
    ],
  },
  {
    id: 'come', title: 'Come', summary: 'A happy response to their name or a cue.',
    pro: true,
    steps: [
      'Start indoors. Say your dog’s name and “Come” in a bright, friendly voice.',
      'When they reach you, reward generously. Coming to you should always be great.',
      'Never call your dog to end the fun or to scold them.',
      'Practise in a larger room, then a fenced area, then outdoors on a long line.',
    ],
  },
  {
    id: 'recall', title: 'Recall', summary: 'A reliable come-back, even with distractions.',
    pro: true,
    steps: [
      'Pick a special recall cue (or whistle) used only for this.',
      'Pair the cue with the best treats you have, every single time.',
      'Practise with mild distractions first, using a long line for safety.',
      'Raise difficulty gradually. If they fail, go back one step — it’s our job, not theirs.',
    ],
  },
];
