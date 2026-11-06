import test from 'node:test';
import assert from 'node:assert/strict';
import { getPreferredBeddings } from '../src/index.ts';
test('legacy saved searches migrate to canonical multi-seabed intent', () => {
  assert.deepEqual(getPreferredBeddings({ preferredBedding: 'sand' }), ['sand']);
  assert.deepEqual(getPreferredBeddings({ preferredBedding: 'any' }), []);
  assert.deepEqual(getPreferredBeddings({}), []);
  assert.deepEqual(getPreferredBeddings({ preferredBedding: 'sand', preferredBeddings: [] }), []);
  assert.deepEqual(
    getPreferredBeddings({ preferredBedding: 'rock', preferredBeddings: ['mud', 'sand'] }),
    ['sand', 'mud'],
  );
});
