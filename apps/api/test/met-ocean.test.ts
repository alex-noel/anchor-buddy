import test from 'node:test';
import assert from 'node:assert/strict';
import { MetOceanProvider } from '../src/providers/met-ocean.js';
import { MetNorwayProvider } from '../src/providers/met-norway.js';
import { ProviderError } from '../src/providers/http.js';
import { mergeForecasts } from '../src/providers/discovery.js';
import type { HttpTransport } from '../src/providers/contracts.js';
import type { DiscoverRequest } from '../src/providers/live-types.js';

const input: DiscoverRequest = {
  center: [5, 60.1],
  radiusNm: 2,
  from: '2026-11-11T12:00:00Z',
  until: '2026-11-12T12:00:00Z',
};
const body = {
  geometry: { type: 'Point', coordinates: [5.0012, 60.1023] },
  properties: {
    meta: { units: { sea_surface_wave_height: 'm', sea_water_speed: 'm/s' } },
    timeseries: [
      {
        time: '2026-11-11T12:00:00Z',
        data: { instant: { details: { sea_surface_wave_height: 1.3, sea_water_speed: 0.1 } } },
      },
      {
        time: '2026-11-11T13:00:00Z',
        data: { instant: { details: { sea_surface_wave_height: null } } },
      },
      {
        time: '2026-11-11T14:00:00Z',
        data: { instant: { details: { sea_surface_wave_height: 2 } } },
      },
    ],
  },
};
const fixture = (data: unknown = body): HttpTransport => ({
  async json<T>(url: string) {
    return {
      data: data as T,
      provenance: {
        providerId: 'met-ocean',
        url,
        retrievedAt: input.from!,
        validUntil: '2026-11-11T13:00:00Z',
      },
    };
  },
});
test('ocean model retains actual sea coordinate, significant waves and missing coastal/current evidence', async () => {
  const result = await new MetOceanProvider(fixture()).forecast(input);
  assert.deepEqual(result.position, [5.0012, 60.1023]);
  assert.equal(result.frames.length, 1);
  assert.equal(result.frames[0]!.waveM, 1.3);
  assert.equal(result.frames[0]!.currentKnots, null);
  assert.equal(result.frames[0]!.swellM, null);
  assert.match(result.status.message, /nearest sea point/);
  assert.equal(mergeForecasts([], [], [], input, result.frames)[0]!.waveM, 1.3);
});
test('Mediterranean and Asian points make no Northwestern Europe wave request', async () => {
  let calls = 0;
  const http: HttpTransport = {
    async json<T>() {
      calls++;
      return {
        data: body as T,
        provenance: {
          providerId: 'x',
          url: 'https://fixture.example',
          retrievedAt: input.from!,
          validUntil: input.until!,
        },
      };
    },
  };
  for (const center of [
    [16.44, 43.5],
    [103.84, 1.25],
  ] as [number, number][])
    await assert.rejects(
      new MetOceanProvider(http).forecast({ ...input, center }),
      (error) => error instanceof ProviderError && error.code === 'OUTSIDE_COVERAGE',
    );
  assert.equal(calls, 0);
});
test('provider model coverage errors and unsupported units never become zero waves', async () => {
  await assert.rejects(
    new MetOceanProvider({
      json: async () => {
        throw new ProviderError('UPSTREAM_UNAVAILABLE', 'Outside model', 422);
      },
    }).forecast(input),
    (error) => error instanceof ProviderError && error.code === 'OUTSIDE_COVERAGE',
  );
  const bad = structuredClone(body);
  bad.properties.meta.units.sea_surface_wave_height = 'ft';
  await assert.rejects(new MetOceanProvider(fixture(bad)).forecast(input), /No MET Oceanforecast/);
});

test('MET adapters preserve a short source expiry exactly', async () => {
  const expiry = '2026-11-11T12:02:00Z';
  const http: HttpTransport = {
    async json<T>(url: string) {
      return {
        data: (url.includes('oceanforecast')
          ? body
          : {
              properties: {
                meta: { units: { wind_speed: 'm/s', wind_from_direction: 'degrees' } },
                timeseries: body.properties.timeseries.map((item) => ({
                  time: item.time,
                  data: { instant: { details: { wind_speed: 4, wind_from_direction: 270 } } },
                })),
              },
            }) as T,
        provenance: { providerId: 'fixture', url, retrievedAt: input.from!, validUntil: expiry },
      };
    },
  };
  for (const provider of [new MetOceanProvider(http), new MetNorwayProvider(http)]) {
    const result = await provider.forecast(input);
    assert.equal(result.source.validUntil, expiry);
    assert.equal(result.status.validUntil, expiry);
  }
});
