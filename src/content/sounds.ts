// Sound metadata is separate from playback. Add licensed audio files to assets/sounds and list them here.
// Every file below is a distinct recording by Joseph Sardin, released under CC0 1.0 (public domain) on
// BigSoundBank.com (https://bigsoundbank.com/licenses.html). Credit is optional but appreciated:
// "Additional sounds: Joseph SARDIN - BigSoundBank.com". Never duplicate a file to pad the count.
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

const BSB_ATTRIBUTION = 'Joseph Sardin – BigSoundBank.com';
const bsb = (page: string) => `CC0 – bigsoundbank.com/${page}`;

export const SOUNDS: Sound[] = [
  // Barks
  { id: 'bark-sled-dog-short', title: 'Sled dog bark', category: 'barks', source: require('../../assets/sounds/bark-sled-dog-short.mp3'), license: bsb('barking-dog-3-s2955.html'), attribution: BSB_ATTRIBUTION },
  { id: 'bark-german-shepherd-indoors', title: 'German shepherd barking', category: 'barks', source: require('../../assets/sounds/bark-german-shepherd-indoors.mp3'), license: bsb('barking-dog-inside-s0112.html'), attribution: BSB_ATTRIBUTION },
  { id: 'bark-old-dog-1', title: 'Old dog woof', category: 'barks', source: require('../../assets/sounds/bark-old-dog-1.mp3'), license: bsb('old-dog-barking-1-s2352.html'), attribution: BSB_ATTRIBUTION },
  { id: 'bark-dogs-duo', title: 'Two dogs barking', category: 'barks', source: require('../../assets/sounds/bark-dogs-duo.mp3'), license: bsb('barking-dogs-s0288.html'), attribution: BSB_ATTRIBUTION },
  { id: 'bark-old-dog-2', title: 'Senior dog barking', category: 'barks', source: require('../../assets/sounds/bark-old-dog-2.mp3'), license: bsb('old-dog-barking-3-s2354.html'), attribution: BSB_ATTRIBUTION, pro: true },
  { id: 'bark-old-dog-gravel', title: 'Old dog on a gravel path', category: 'barks', source: require('../../assets/sounds/bark-old-dog-gravel.mp3'), license: bsb('old-dog-barking-2-s2353.html'), attribution: BSB_ATTRIBUTION, pro: true },
  { id: 'bark-sled-dog-long', title: 'Sled dog barking spree', category: 'barks', source: require('../../assets/sounds/bark-sled-dog-long.mp3'), license: bsb('barking-dog-2-s2954.html'), attribution: BSB_ATTRIBUTION, pro: true },
  { id: 'bark-small-mudi', title: 'Small herding dog barking', category: 'barks', source: require('../../assets/sounds/bark-small-mudi.m4a'), license: bsb('small-dog-barking-s0612.html'), attribution: BSB_ATTRIBUTION, pro: true },
  { id: 'bark-sled-dog-pack', title: 'Pack of sled dogs', category: 'barks', source: require('../../assets/sounds/bark-sled-dog-pack.m4a'), license: bsb('pack-of-dogs-s2953.html'), attribution: BSB_ATTRIBUTION, pro: true },

  // Growls
  { id: 'growl-spitz', title: 'Spitz growl and bark', category: 'growls', source: require('../../assets/sounds/growl-spitz.mp3'), license: bsb('barking-of-a-spitz-s0682.html'), attribution: BSB_ATTRIBUTION },
  { id: 'growl-small-dogs-fence', title: 'Small dogs growling at the fence', category: 'growls', source: require('../../assets/sounds/growl-small-dogs-fence.m4a'), license: bsb('small-dogs-bark-growl-s1060.html'), attribution: BSB_ATTRIBUTION, pro: true },

  // Whines
  { id: 'whine-dog-crying-1', title: 'Dog whimpering', category: 'whines', source: require('../../assets/sounds/whine-dog-crying-1.mp3'), license: bsb('dogs-barking-and-crying-1-s1544.html'), attribution: BSB_ATTRIBUTION },
  { id: 'whine-dog-crying-2', title: 'Dog crying softly', category: 'whines', source: require('../../assets/sounds/whine-dog-crying-2.mp3'), license: bsb('dogs-barking-and-crying-2-s1545.html'), attribution: BSB_ATTRIBUTION },
  { id: 'whine-dog-crying-3', title: 'Whining for attention', category: 'whines', source: require('../../assets/sounds/whine-dog-crying-3.m4a'), license: bsb('dogs-barking-and-crying-3-s1546.html'), attribution: BSB_ATTRIBUTION, pro: true },

  // Howls
  { id: 'howl-singing-dog-1', title: 'Singing dog howl', category: 'howls', source: require('../../assets/sounds/howl-singing-dog-1.mp3'), license: bsb('dog-singing-1-s2450.html'), attribution: BSB_ATTRIBUTION },
  { id: 'howl-singing-dog-2', title: 'Singing dog yodel', category: 'howls', source: require('../../assets/sounds/howl-singing-dog-2.mp3'), license: bsb('dog-singing-2-s2451.html'), attribution: BSB_ATTRIBUTION, pro: true },

  // Playful
  { id: 'playful-panting-big-dogs', title: 'Happy panting after play', category: 'playful', source: require('../../assets/sounds/playful-panting-big-dogs.mp3'), license: bsb('dogs-breathing-s1547.html'), attribution: BSB_ATTRIBUTION },

  // Attention
  { id: 'attention-small-dog-at-door', title: 'Small dog at the door', category: 'attention', source: require('../../assets/sounds/attention-small-dog-at-door.m4a'), license: bsb('small-dog-barking-behind-door-s3537.html'), attribution: BSB_ATTRIBUTION },
  { id: 'attention-dogs-at-gate', title: 'Dogs barking at the gate', category: 'attention', source: require('../../assets/sounds/attention-dogs-at-gate.m4a'), license: bsb('2-dogs-barking-s0868.html'), attribution: BSB_ATTRIBUTION, pro: true },

  // Squeaky toys
  { id: 'squeaky-toy-long', title: 'Squeaky toy', category: 'squeaky', source: require('../../assets/sounds/squeaky-toy-long.mp3'), license: bsb('squeaker-toy-2-s0879.html'), attribution: BSB_ATTRIBUTION },
  { id: 'squeaky-pear-horn-1', title: 'Squeaky horn toy', category: 'squeaky', source: require('../../assets/sounds/squeaky-pear-horn-1.mp3'), license: bsb('couinement-jouet-3-s3333.html'), attribution: BSB_ATTRIBUTION },
  { id: 'squeaky-giraffe-toy', title: 'Rubber giraffe squeak', category: 'squeaky', source: require('../../assets/sounds/squeaky-giraffe-toy.mp3'), license: bsb('pouet-of-a-toy-s0427.html'), attribution: BSB_ATTRIBUTION },
  { id: 'squeaky-pear-horn-2', title: 'Quick squeak', category: 'squeaky', source: require('../../assets/sounds/squeaky-pear-horn-2.mp3'), license: bsb('couinement-jouet-1-s3331.html'), attribution: BSB_ATTRIBUTION, pro: true },
  { id: 'squeaky-pear-horn-3', title: 'Double squeak', category: 'squeaky', source: require('../../assets/sounds/squeaky-pear-horn-3.mp3'), license: bsb('couinement-jouet-4-s3334.html'), attribution: BSB_ATTRIBUTION, pro: true },
  { id: 'squeaky-pear-horn-4', title: 'Squeak-squeak-squeak', category: 'squeaky', source: require('../../assets/sounds/squeaky-pear-horn-4.mp3'), license: bsb('couinement-jouet-6-s3336.html'), attribution: BSB_ATTRIBUTION, pro: true },

  // Doorbells
  { id: 'doorbell-electronic', title: 'Electronic doorbell', category: 'doorbell', source: require('../../assets/sounds/doorbell-electronic.mp3'), license: bsb('doorbell-2-s0160.html'), attribution: BSB_ATTRIBUTION },
  { id: 'doorbell-mechanical-short', title: 'Ring-ring doorbell', category: 'doorbell', source: require('../../assets/sounds/doorbell-mechanical-short.mp3'), license: bsb('mechanical-doorbell-short-s1206.html'), attribution: BSB_ATTRIBUTION },
  { id: 'doorbell-bigben-chime', title: 'Big Ben door chime', category: 'doorbell', source: require('../../assets/sounds/doorbell-bigben-chime.mp3'), license: bsb('doorbell-house-1-s0159.html'), attribution: BSB_ATTRIBUTION, pro: true },
  { id: 'doorbell-large-chime', title: 'Ding-dong house chime', category: 'doorbell', source: require('../../assets/sounds/doorbell-large-chime.mp3'), license: bsb('doorbell-8-s2880.html'), attribution: BSB_ATTRIBUTION, pro: true },

  // Training
  { id: 'training-clicker-pen', title: 'Training clicker', category: 'training', source: require('../../assets/sounds/training-clicker-pen.mp3'), license: bsb('pen-click-s0613.html'), attribution: BSB_ATTRIBUTION },
  { id: 'training-whistle-plastic', title: 'Recall whistle', category: 'training', source: require('../../assets/sounds/training-whistle-plastic.mp3'), license: bsb('plastic-whistle-s1017.html'), attribution: BSB_ATTRIBUTION },
  { id: 'training-whistle-wooden', title: 'Single-note whistle', category: 'training', source: require('../../assets/sounds/training-whistle-wooden.mp3'), license: bsb('wooden-whistle-one-note-s0196.html'), attribution: BSB_ATTRIBUTION, pro: true },
  { id: 'training-whistles-plastic-set', title: 'Whistle signals', category: 'training', source: require('../../assets/sounds/training-whistles-plastic-set.mp3'), license: bsb('whistle-plastic-3-s1141.html'), attribution: BSB_ATTRIBUTION, pro: true },
];

// Phrase -> sound per dog size. Same rule: only real, licensed assets (reusing catalog files is fine here).
export type Phrase = 'come' | 'sit' | 'stay' | 'goodDog' | 'play' | 'outside';
export const PHRASES: Phrase[] = ['come', 'sit', 'stay', 'goodDog', 'play', 'outside'];
// Words that point to a phrase when the exact wording isn't used (en, es, fr, de, pt), for matchPhrase.
export const PHRASE_KEYWORDS: Record<Phrase, string[]> = {
  come: ['come', 'here', 'come back', 'ven', 'aqui', 'viens', 'ici', 'komm', 'hier', 'vem', 'venha'],
  sit: ['sit', 'sit down', 'sientate', 'sentado', 'assis', 'assieds', 'sitz', 'senta'],
  stay: ['stay', 'wait', 'stop', 'hold', 'quieto', 'espera', 'reste', 'attends', 'bleib', 'warte', 'fica', 'parado'],
  goodDog: ['good', 'boy', 'girl', 'well done', 'nice', 'buen', 'bueno', 'bravo', 'bon', 'brav', 'gut', 'bom', 'lindo'],
  play: ['play', 'fetch', 'ball', 'toy', 'game', 'juega', 'jugar', 'pelota', 'joue', 'jouer', 'balle', 'spiel', 'spielen', 'brincar', 'bola'],
  outside: ['outside', 'out', 'walk', 'walkies', 'park', 'garden', 'fuera', 'afuera', 'paseo', 'dehors', 'promenade', 'sortir', 'raus', 'draussen', 'gassi', 'fora', 'passear', 'rua'],
};
export const PHRASE_SOUNDS: Partial<Record<Phrase, Partial<Record<'small' | 'medium' | 'big', number>>>> = {
  come: {
    small: require('../../assets/sounds/attention-small-dog-at-door.m4a'),
    medium: require('../../assets/sounds/bark-sled-dog-long.mp3'),
    big: require('../../assets/sounds/bark-old-dog-gravel.mp3'),
  },
  sit: {
    small: require('../../assets/sounds/growl-spitz.mp3'),
    medium: require('../../assets/sounds/bark-sled-dog-short.mp3'),
    big: require('../../assets/sounds/bark-german-shepherd-indoors.mp3'),
  },
  stay: {
    small: require('../../assets/sounds/growl-spitz.mp3'),
    medium: require('../../assets/sounds/bark-old-dog-1.mp3'),
    big: require('../../assets/sounds/bark-old-dog-2.mp3'),
  },
  goodDog: {
    small: require('../../assets/sounds/howl-singing-dog-1.mp3'),
    medium: require('../../assets/sounds/howl-singing-dog-2.mp3'),
    big: require('../../assets/sounds/playful-panting-big-dogs.mp3'),
  },
  play: {
    small: require('../../assets/sounds/bark-small-mudi.m4a'),
    medium: require('../../assets/sounds/bark-dogs-duo.mp3'),
    big: require('../../assets/sounds/bark-sled-dog-pack.m4a'),
  },
  outside: {
    small: require('../../assets/sounds/attention-small-dog-at-door.m4a'),
    medium: require('../../assets/sounds/attention-dogs-at-gate.m4a'),
    big: require('../../assets/sounds/bark-german-shepherd-indoors.mp3'),
  },
};

// Illustrated cover art for each sound, keyed by sound id. Generated for this app (3D cartoon dogs), so no third-party licence applies.
export const SOUND_ART: Record<string, number> = {
  'attention-dogs-at-gate': require('../../assets/sound-art/attention-dogs-at-gate.jpg'),
  'attention-small-dog-at-door': require('../../assets/sound-art/attention-small-dog-at-door.jpg'),
  'bark-dogs-duo': require('../../assets/sound-art/bark-dogs-duo.jpg'),
  'bark-german-shepherd-indoors': require('../../assets/sound-art/bark-german-shepherd-indoors.jpg'),
  'bark-old-dog-1': require('../../assets/sound-art/bark-old-dog-1.jpg'),
  'bark-old-dog-2': require('../../assets/sound-art/bark-old-dog-2.jpg'),
  'bark-old-dog-gravel': require('../../assets/sound-art/bark-old-dog-gravel.jpg'),
  'bark-sled-dog-long': require('../../assets/sound-art/bark-sled-dog-long.jpg'),
  'bark-sled-dog-pack': require('../../assets/sound-art/bark-sled-dog-pack.jpg'),
  'bark-sled-dog-short': require('../../assets/sound-art/bark-sled-dog-short.jpg'),
  'bark-small-mudi': require('../../assets/sound-art/bark-small-mudi.jpg'),
  'doorbell-bigben-chime': require('../../assets/sound-art/doorbell-bigben-chime.jpg'),
  'doorbell-electronic': require('../../assets/sound-art/doorbell-electronic.jpg'),
  'doorbell-large-chime': require('../../assets/sound-art/doorbell-large-chime.jpg'),
  'doorbell-mechanical-short': require('../../assets/sound-art/doorbell-mechanical-short.jpg'),
  'growl-small-dogs-fence': require('../../assets/sound-art/growl-small-dogs-fence.jpg'),
  'growl-spitz': require('../../assets/sound-art/growl-spitz.jpg'),
  'howl-singing-dog-1': require('../../assets/sound-art/howl-singing-dog-1.jpg'),
  'howl-singing-dog-2': require('../../assets/sound-art/howl-singing-dog-2.jpg'),
  'playful-panting-big-dogs': require('../../assets/sound-art/playful-panting-big-dogs.jpg'),
  'squeaky-giraffe-toy': require('../../assets/sound-art/squeaky-giraffe-toy.jpg'),
  'squeaky-pear-horn-1': require('../../assets/sound-art/squeaky-pear-horn-1.jpg'),
  'squeaky-pear-horn-2': require('../../assets/sound-art/squeaky-pear-horn-2.jpg'),
  'squeaky-pear-horn-3': require('../../assets/sound-art/squeaky-pear-horn-3.jpg'),
  'squeaky-pear-horn-4': require('../../assets/sound-art/squeaky-pear-horn-4.jpg'),
  'squeaky-toy-long': require('../../assets/sound-art/squeaky-toy-long.jpg'),
  'training-clicker-pen': require('../../assets/sound-art/training-clicker-pen.jpg'),
  'training-whistle-plastic': require('../../assets/sound-art/training-whistle-plastic.jpg'),
  'training-whistle-wooden': require('../../assets/sound-art/training-whistle-wooden.jpg'),
  'training-whistles-plastic-set': require('../../assets/sound-art/training-whistles-plastic-set.jpg'),
  'whine-dog-crying-1': require('../../assets/sound-art/whine-dog-crying-1.jpg'),
  'whine-dog-crying-2': require('../../assets/sound-art/whine-dog-crying-2.jpg'),
  'whine-dog-crying-3': require('../../assets/sound-art/whine-dog-crying-3.jpg'),
};
