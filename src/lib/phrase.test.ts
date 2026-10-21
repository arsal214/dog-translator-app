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
