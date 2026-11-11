import test from 'node:test';
import assert from 'node:assert/strict';
import { isMapContext } from '@anchor-buddy/domain';
import { EmodnetContextProvider } from '../src/providers/emodnet-context.js';
import type { HttpTransport, Sourced } from '../src/providers/contracts.js';
import type { DiscoverRequest } from '../src/providers/live-types.js';

const request: DiscoverRequest = { center: [16.44, 43.49], radiusNm: 3 };
const provenance = {
  providerId: 'fixture',
  url: 'https://fixture.example/source',
  retrievedAt: '2026-11-11T10:00:00Z',
  validUntil: '2026-11-12T10:00:00Z',
};
// Schema and public scientific values verified against the two EMODnet point endpoints.
// Personal contact properties below are invented test strings, never copied from the service.
const depth = {
  min: -43.940876,
  max: -40.797813,
  avg: -42.305126,
  stdev: 0.728,
  interpolationType: false,
  reference: {
    identifier: 'Split-Kastelanski zaljev',
    metadata_url: 'https://sextant.ifremer.fr/record/SDN_CPRD_701_Split-Kastelanski%20zaljev',
  },
};
const seabed = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [1, 2],
            [3, 4],
          ],
        ],
      },
      properties: {
        original_substrate: 'Mud',
        folk_5cl_txt: '1. Mud to muddy Sand',
        scale: 100000,
        data_holder: 'HHI',
        name: 'HIJRM (1985): Karta svojstava morskog dna',
        references: 'HIJRM (1985): Karta svojstava morskog dna; 1:100000',
        comments: 'Unofficial map of sediments; Not for navigation purpose',
        contact: 'private-fixture@example.invalid',
      },
    },
  ],
};
function fixture(value: unknown, calls: string[] = []): HttpTransport {
  return {
    async json<T>(url: string) {
      calls.push(url);
      return { data: value as T, provenance };
    },
  };
}
const failed: HttpTransport = {
  async json() {
    throw new Error('unreachable');
  },
};

test('real response schema retains signed DTM and source vintage without creating safety evidence', async () => {
  const calls: string[] = [];
  const result = await new EmodnetContextProvider(
    fixture(depth, calls),
    fixture(seabed, calls),
  ).sample(request);
  assert.equal(isMapContext(result.context), true);
  assert.deepEqual(result.context?.depth, {
    meanM: -42.305126,
    minM: -43.940876,
    maxM: -40.797813,
    datum: 'LAT',
    interpolated: false,
    reference: 'Split-Kastelanski zaljev',
    metadataUrl: depth.reference.metadata_url,
  });
  assert.equal(result.context?.seabed?.label, 'Mud');
  assert.equal(result.context?.seabed?.scale, 100000);
  assert.equal(result.context?.seabed?.originator, 'HHI');
  assert.match(result.context?.seabed?.reference ?? '', /1985/);
  assert.match(result.context?.seabed?.notes ?? '', /Not for navigation/);
  assert.deepEqual(Object.keys(result.context!).sort(), [
    'depth',
    'notice',
    'position',
    'seabed',
    'sources',
  ]);
  assert.equal(result.sources.length, 2);
  for (const source of result.sources) {
    assert.equal(source.retrievedAt, provenance.retrievedAt);
    assert.equal(source.validUntil, provenance.validUntil);
    assert.equal(source.synthetic, false);
    assert.match(source.license, /CC BY 4.0/);
  }
  assert.equal(result.status.status, 'partial');
  assert.doesNotMatch(
    JSON.stringify(result),
    /private-fixture|geometry|coordinates|holdingAreas|coverageAreaIds/,
  );
  assert.equal(calls.length, 2);
  assert.equal(new URL(calls[0]!).searchParams.get('geom'), 'POINT(16.44 43.49)');
  const params = new URL(calls[1]!).searchParams;
  assert.equal(params.get('bbox'), '16.4390,43.4890,16.4410,43.4910');
  assert.equal(params.get('buffer'), '0');
  assert.equal(params.get('feature_count'), '1');
  assert.equal(
    params.get('propertyName'),
    'original_substrate,folk_5cl_txt,scale,data_holder,name,comments,references',
  );
});

test('missing or invalid numeric bounds remain missing, while documented positive values keep their sign', async () => {
  for (const invalid of [
    null,
    {},
    { min: null, avg: null, max: null },
    { min: '1', avg: '2', max: '3' },
    { min: -2, avg: -9, max: -1 },
    { min: -99999, avg: -99999, max: -99999 },
  ]) {
    const result = await new EmodnetContextProvider(
      fixture(invalid),
      fixture({ type: 'FeatureCollection', features: [] }),
    ).sample(request);
    assert.equal(result.context, undefined);
    assert.deepEqual(result.sources, []);
    assert.equal(result.status.status, 'unavailable');
    assert.equal(result.status.validUntil, undefined);
    assert.deepEqual(result.failures, []);
  }
  const result = await new EmodnetContextProvider(
    fixture({ min: 31.2, avg: 31.25, max: 31.3 }),
    fixture({}),
  ).sample(request);
  assert.equal(result.context?.depth?.meanM, 31.25);
  assert.equal(result.context?.depth?.interpolated, null);
  assert.equal(result.context?.seabed, undefined);
});

test('upstream contact fields and unsafe metadata links never escape into cached context', async () => {
  const row = structuredClone(seabed);
  row.features[0]!.properties.comments += ' Contact invented@example.invalid for details.';
  const result = await new EmodnetContextProvider(
    fixture({
      ...depth,
      reference: {
        identifier: 'source',
        metadata_url: 'https://user:password@example.invalid/data',
      },
    }),
    fixture(row),
  ).sample(request);
  assert.doesNotMatch(JSON.stringify(result), /invented@|private-fixture|password|user:|Polygon/);
  assert.equal(result.context?.depth?.metadataUrl, undefined);
  assert.match(result.context?.seabed?.notes ?? '', /Not for navigation/);
});

test('Asia and unsupported coordinates make no European requests', async () => {
  const calls: string[] = [];
  const provider = new EmodnetContextProvider(fixture(depth, calls), fixture(seabed, calls));
  for (const center of [
    [132.5, 34.2],
    [98.4, 7.8],
    [-81.8, 24.55],
  ] as [number, number][]) {
    const result = await provider.sample({ ...request, center });
    assert.equal(result.status.status, 'not-covered');
    assert.deepEqual(result.sources, []);
    assert.equal(result.context, undefined);
  }
  await assert.rejects(provider.sample({ ...request, center: [NaN, 43] }), /Invalid context/);
  assert.deepEqual(calls, []);
});

test('independent source failures retain only real available context and report the gap', async () => {
  const one = await new EmodnetContextProvider(failed, fixture(seabed)).sample(request);
  assert.equal(one.context?.depth, undefined);
  assert.equal(one.context?.seabed?.label, 'Mud');
  assert.equal(one.sources.length, 1);
  assert.match(one.status.message, /DTM service could not be reached/);
  assert.deepEqual(one.failures, ['depth']);
  const none = await new EmodnetContextProvider(failed, failed).sample(request);
  assert.equal(none.context, undefined);
  assert.equal(none.status.status, 'unavailable');
  assert.deepEqual(none.failures, ['depth', 'seabed']);
});

test('depth and seabed point requests start together without a provider waterfall', async () => {
  const pending: ((value: Sourced<unknown>) => void)[] = [];
  const http: HttpTransport = {
    json<T>() {
      return new Promise<Sourced<T>>((resolve) =>
        pending.push(resolve as (value: Sourced<unknown>) => void),
      );
    },
  };
  const result = new EmodnetContextProvider(http, http).sample(request);
  assert.equal(pending.length, 2);
  pending[0]!({ data: depth, provenance });
  pending[1]!({ data: seabed, provenance });
  assert.equal((await result).sources.length, 2);
});
