import test from 'node:test';
import assert from 'node:assert/strict';
import { GovernmentHttp, ProviderError } from '../src/providers/http.js';
import { NwsProvider, toSI } from '../src/providers/nws.js';
import { CoopsProvider } from '../src/providers/coops.js';
import type { HttpTransport } from '../src/providers/contracts.js';

const source = {
  providerId: 'fixture',
  url: 'https://api.weather.gov/fixture',
  retrievedAt: '2026-10-30T12:00:00Z',
  validUntil: '2026-10-30T13:00:00Z',
};
test('NWS uses forecastGridData, preserves null waves, and fetches active alerts', async () => {
  const calls: string[] = [];
  const http: HttpTransport = {
    async json<T>(url: string) {
      calls.push(url);
      const data = url.includes('/points/')
        ? { properties: { forecastGridData: 'https://api.weather.gov/gridpoints/KEY/1,2' } }
        : url.includes('/alerts/')
          ? {
              features: [
                {
                  id: 'marine-warning',
                  geometry: null,
                  properties: { event: 'Special Marine Warning' },
                },
              ],
            }
          : {
              properties: {
                updateTime: source.retrievedAt,
                windSpeed: {
                  uom: 'wmoUnit:km_h-1',
                  values: [{ validTime: '2026-10-30T12:00:00Z/PT1H', value: 36 }],
                },
                waveHeight: {
                  uom: 'wmoUnit:m',
                  values: [{ validTime: '2026-10-30T12:00:00Z/PT1H', value: null }],
                },
              },
            };
      return { data: data as T, provenance: source };
    },
  };
  const result = await new NwsProvider(http).marine(24.55, -81.8);
  assert.equal(calls.length, 3);
  assert.ok(calls[1]?.includes('/gridpoints/'));
  assert.ok(calls[2]?.includes('/alerts/active?point='));
  assert.deepEqual(result.missing, ['windGust', 'windDirection', 'waveHeight']);
  assert.equal(result.alerts.data.features[0]?.id, 'marine-warning');
  assert.equal(toSI(36, 'wmoUnit:km_h-1'), 10);
  assert.equal(toSI(5, 'unrecognized-unit'), null);
});

test('HTTP cache respects expiry and shares in-flight reads without stale success', async () => {
  let clock = 0,
    count = 0;
  const provider = new GovernmentHttp({
    providerId: 'test',
    userAgent: 'test',
    hosts: ['api.weather.gov'],
    now: () => clock,
    fetch: (async () => {
      count++;
      if (count === 2) return new Response('unavailable', { status: 503 });
      return new Response('{"ok":true}', { headers: { 'cache-control': 'max-age=1' } });
    }) as typeof fetch,
  });
  await Promise.all([
    provider.json('https://api.weather.gov/test'),
    provider.json('https://api.weather.gov/test'),
  ]);
  assert.equal(count, 1);
  clock = 2000;
  await assert.rejects(
    provider.json('https://api.weather.gov/test'),
    (error) => error instanceof ProviderError && error.status === 503,
  );
  assert.equal(count, 2);
});

test('HTTP transport rejects private or off-provider requests before fetching', async () => {
  let called = false;
  const provider = new GovernmentHttp({
    providerId: 'test',
    userAgent: 'test',
    hosts: ['api.weather.gov'],
    fetch: (async () => {
      called = true;
      return new Response('{}');
    }) as typeof fetch,
  });
  await assert.rejects(provider.json('http://127.0.0.1/secrets'));
  await assert.rejects(provider.json('https://example.com/secrets'));
  assert.equal(called, false);
});

test('CO-OPS refuses unreviewed and datum-mismatched station extrapolation', async () => {
  const http: HttpTransport = {
    async json<T>() {
      return { data: {} as T, provenance: source };
    },
  };
  const input = {
    mappingId: 'station',
    latitude: 24.55,
    longitude: -81.8,
    from: '2026-10-30T12:00:00Z',
    to: '2026-10-31T12:00:00Z',
    chartDatum: 'MLLW',
  };
  await assert.rejects(
    new CoopsProvider(http).predictions(input),
    /No current validated station mapping/,
  );
  const reviewed = new CoopsProvider(http, [
    {
      id: 'station',
      stationId: '8724580',
      kind: 'tides',
      reviewedBy: 'fixture',
      reviewedAt: source.retrievedAt,
      expiresAt: '2099-01-01T00:00:00Z',
      datum: 'MLLW',
      chartDatum: 'MLLW',
      chartOffsetM: 0,
      uncertaintyM: 0.2,
      bounds: [-81.81, 24.54, -81.79, 24.56],
    },
  ]);
  await assert.rejects(reviewed.predictions({ ...input, chartDatum: 'NAVD88' }), /datum/);
  await assert.rejects(reviewed.predictions({ ...input, longitude: -81.5 }), /outside/);
});

test('CO-OPS requests metric UTC six-minute data and retains mapping uncertainty', async () => {
  let request = '';
  const http: HttpTransport = {
    async json<T>(url: string) {
      request = url;
      return {
        data: { predictions: [{ t: '2026-10-30 12:00', v: '0.1' }] } as T,
        provenance: source,
      };
    },
  };
  const provider = new CoopsProvider(http, [
    {
      id: 'reviewed-fixture',
      stationId: '8724580',
      kind: 'tides',
      reviewedBy: 'fixture-only',
      reviewedAt: source.retrievedAt,
      expiresAt: '2099-01-01T00:00:00Z',
      datum: 'MLLW',
      chartDatum: 'MLLW',
      chartOffsetM: 0,
      uncertaintyM: 0.2,
      bounds: [-81.81, 24.54, -81.79, 24.56],
    },
  ]);
  const result = await provider.predictions({
    mappingId: 'reviewed-fixture',
    latitude: 24.55,
    longitude: -81.8,
    from: '2026-10-30T12:00:00Z',
    to: '2026-10-31T12:00:00Z',
    chartDatum: 'MLLW',
  });
  const url = new URL(request);
  assert.equal(url.searchParams.get('time_zone'), 'gmt');
  assert.equal(url.searchParams.get('units'), 'metric');
  assert.equal(url.searchParams.get('interval'), '6');
  assert.equal(url.searchParams.get('datum'), 'MLLW');
  assert.equal((result.data as { mapping: { uncertaintyM: number } }).mapping.uncertaintyM, 0.2);
});
