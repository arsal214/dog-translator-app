// Run: npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractFeatures } from './features.ts';

test('counts separate bursts as separate barks', () => {
  const quiet = -50, loud = -10;
  const f = extractFeatures([quiet, quiet, loud, loud, quiet, quiet, loud, quiet, quiet, quiet], 100);
  assert.equal(f.barkCount, 2);
  assert.equal(f.peakDb, loud);
  assert.equal(f.durationMs, 1000);
});

test('empty input is silent, not NaN', () => {
  const f = extractFeatures([], 100);
  assert.equal(f.durationMs, 0);
  assert.equal(f.barkCount, 0);
});
