import assert from 'node:assert/strict';
import { test } from 'node:test';
import { matchPhrase } from './phrase.ts';

const labels = { come: ['Come here', 'Ven aquí'], sit: ['Sit'], goodDog: ['Good dog'] };

test('matches inside longer speech and ignores case/accents/punctuation', () => {
  assert.equal(matchPhrase('Please, come here boy!', labels), 'come');
  assert.equal(matchPhrase('VEN AQUI', labels), 'come');
  assert.equal(matchPhrase('such a good dog', labels), 'goodDog');
});

test('returns null when nothing matches', () => {
  assert.equal(matchPhrase('banana', labels), null);
  assert.equal(matchPhrase('', labels), null);
});

const all = { come: ['Come here'], sit: ['Sit'], stay: ['Stay'], goodDog: ['Good dog'], play: ["Let's play"], outside: ['Come outside'] };
const keywords = { come: ['come', 'here'], stay: ['stay', 'wait'], goodDog: ['good', 'boy'], play: ['play', 'fetch', 'ball'], outside: ['outside', 'walk', 'park'] };

test('falls back to keywords when the exact phrase is not used', () => {
  assert.equal(matchPhrase('go outside', all, keywords), 'outside');
  assert.equal(matchPhrase("let's go for a walk", all, keywords), 'outside');
  assert.equal(matchPhrase('fetch the ball', all, keywords), 'play');
  assert.equal(matchPhrase('wait there', all, keywords), 'stay');
  assert.equal(matchPhrase('who is a good boy', all, keywords), 'goodDog');
});

test('an exact phrase beats keywords, and keywords need whole words', () => {
  assert.equal(matchPhrase('come outside now', all, keywords), 'outside');
  assert.equal(matchPhrase('come here', all, keywords), 'come');
  assert.equal(matchPhrase('without', all, keywords), null);
});
