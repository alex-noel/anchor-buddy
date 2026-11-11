import test from 'node:test';
import assert from 'node:assert/strict';
import { isMapContext, type MapContext } from '../src/index.ts';

const context: MapContext = {
  position: [16.44, 43.49],
  notice: 'Scientific point context; not chart clearance evidence.',
  depth: { meanM: -42, minM: -44, maxM: -40, datum: 'LAT', interpolated: false },
  seabed: {
    label: 'Mud',
    scale: 100000,
    originator: 'Hydrographic institute',
    reference: '1985 substrate map',
    notes: 'Not for navigation',
  },
  sources: [
    {
      id: 'context',
      name: 'EMODnet',
      url: 'https://emodnet.ec.europa.eu',
      retrievedAt: '2026-11-11T00:00:00Z',
      validUntil: '2026-11-12T00:00:00Z',
      attribution: 'EMODnet and originators',
      license: 'CC BY 4.0',
      synthetic: false,
    },
  ],
};

test('scientific point context preserves signed values, original dates and survey references', () => {
  assert.equal(isMapContext(context), true);
  const restored = JSON.parse(JSON.stringify(context));
  assert.equal(isMapContext(restored), true);
  assert.deepEqual(restored, context);
});

test('context rejects invalid coordinates, inverted bounds, unsupported datums and synthetic sources', () => {
  for (const invalid of [
    null,
    {},
    { ...context, position: [190, 43] },
    { ...context, depth: { ...context.depth, minM: -30 } },
    { ...context, depth: { ...context.depth, datum: 'unknown' } },
    { ...context, sources: [{ ...context.sources[0], synthetic: true }] },
    { ...context, sources: [{ ...context.sources[0], synthetic: undefined }] },
    { ...context, seabed: { ...context.seabed, scale: -100 } },
  ])
    assert.equal(isMapContext(invalid), false);
});
