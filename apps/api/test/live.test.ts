import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultSearch,
  DEFAULT_VESSEL,
  searchRegion,
  validateRegionPack,
} from '@anchor-buddy/domain';
import { GovernmentHttp, ProviderError } from '../src/providers/http.js';
import type { HttpTransport } from '../src/providers/contracts.js';
import { OverpassProvider } from '../src/providers/overpass.js';
import { MetNorwayProvider } from '../src/providers/met-norway.js';
import { OpenMeteoMarineProvider } from '../src/providers/open-meteo.js';
import { NominatimProvider } from '../src/providers/geocode.js';
import { NwsProvider } from '../src/providers/nws.js';
import { NwsLiveProvider } from '../src/providers/nws-live.js';
import { DiscoveryService, validateDiscovery } from '../src/providers/discovery.js';
import { OpenFreeMapProxy } from '../src/providers/map-proxy.js';
import { createApp } from '../src/server.js';
import type { DiscoverRequest } from '../src/providers/live-types.js';

const now = new Date('2026-11-03T12:00:00Z');
const input: DiscoverRequest = {
  center: [5.36, 43.29],
  radiusNm: 3,
  name: 'Marseille',
  from: now.toISOString(),
  until: '2026-11-04T12:00:00Z',
};
const provenance = {
  providerId: 'fixture',
  url: 'https://fixture.example/data',
  retrievedAt: now.toISOString(),
  validUntil: '2026-11-03T13:00:00Z',
};
function fixture(value: unknown, calls: string[] = []): HttpTransport {
  return {
    async json<T>(url: string) {
      calls.push(url);
      return { data: value as T, provenance };
    },
  };
}
const osm = {
  elements: [
    {
      type: 'way',
      id: 123,
      center: { lon: 5.36, lat: 43.29 },
      tags: {
        name: 'Fixture marina',
        leisure: 'marina',
        fee: 'no',
        depth: '8',
        access: 'yes',
        seabed: 'sand',
      },
    },
    {
      type: 'node',
      id: 124,
      lon: 5.36,
      lat: 43.29,
      tags: { name: 'Fixture mooring', 'seamark:type': 'mooring' },
    },
    {
      type: 'node',
      id: 125,
      lon: 5.36,
      lat: 43.29,
      tags: { 'seamark:type': 'buoy_isolated_danger' },
    },
    { type: 'node', id: 126, lon: 50, lat: 43.29, tags: { leisure: 'marina' } },
  ],
};
const met = {
  properties: {
    meta: {
      updated_at: now.toISOString(),
      units: { wind_speed: 'm/s', wind_from_direction: 'degrees' },
    },
    timeseries: [
      {
        time: '2026-11-03T12:00:00Z',
        data: { instant: { details: { wind_speed: 10, wind_from_direction: 270 } } },
      },
      {
        time: '2026-11-03T13:00:00Z',
        data: { instant: { details: { wind_speed: 8, wind_from_direction: 280 } } },
      },
      {
        time: '2026-11-03T14:00:00Z',
        data: { instant: { details: { wind_speed: 6, wind_from_direction: 290 } } },
      },
    ],
  },
};
const live = () =>
  new DiscoveryService(
    { places: new OverpassProvider(fixture(osm)), wind: new MetNorwayProvider(fixture(met)) },
    () => now,
  );

test('OSM mappings never turn community tags into verified fees, depths or permission', async () => {
  const calls: string[] = [];
  const result = await new OverpassProvider(fixture(osm, calls)).discover(input);
  assert.equal(result.places.length, 2);
  assert.equal(result.marks.length, 1);
  assert.equal(result.places[0]!.feeStatus, 'unknown');
  assert.equal(result.places[0]!.overnightAllowed, null);
  assert.equal(result.places[0]!.holding, 'unknown');
  assert.equal(result.places[0]!.berthMinDepthM, undefined);
  assert.equal(result.places[0]!.tariff, undefined);
  assert.equal(result.places[0]!.vesselLimitsVerified, false);
  assert.ok(result.places[0]!.notes.some((note) => note.includes('Unverified OSM depth: 8')));
  assert.equal(result.marks[0]!.kind, 'isolated_danger');
  assert.equal(result.source.synthetic, false);
  const query = new URL(calls[0]!).searchParams.get('data')!;
  assert.match(query, /around:5556,43\.2900,5\.3600/);
  assert.match(query, /out tags center 601/);
});

test('MET converts wind units, retains missing gust/waves and never extends forecast horizon', async () => {
  const result = await new MetNorwayProvider(fixture(met)).forecast(input);
  assert.equal(result.frames.length, 2);
  assert.ok(Math.abs(result.frames[0]!.windKnots! - 19.438444924) < 0.00001);
  assert.equal(result.frames[0]!.gustKnots, null);
  assert.equal(result.frames[0]!.waveM, null);
  assert.equal(result.frames[0]!.currentKnots, null);
  assert.equal(result.frames[1]!.validUntil, '2026-11-03T14:00:00.000Z');
  assert.equal(result.status.status, 'partial');
  assert.deepEqual(result.frames[0]!.coverageAreaIds, ['live-weather-request']);
});

test('real-source discovery packs pass schema but never safety checks with missing chart evidence', async () => {
  const service = live();
  const result = await service.discover(input);
  assert.deepEqual(validateRegionPack(result.pack), []);
  assert.equal(result.pack.validation.status, 'unreviewed');
  assert.equal(result.partial, true);
  assert.deepEqual(result.pack.depths, []);
  assert.deepEqual(result.pack.tides, []);
  assert.deepEqual(result.pack.restrictions, []);
  assert.ok(result.pack.coverage.every((area) => !area.complete));
  assert.ok(result.pack.sources.every((source) => source.synthetic === false));
  assert.equal(result.pack.chart.styleUrl, undefined);
  const search = {
    ...createDefaultSearch(now),
    origin: input.center,
    maxDistanceNm: 3,
    arrival: input.from!,
    departure: input.until!,
  };
  const assessed = searchRegion(result.pack, DEFAULT_VESSEL, search, undefined, {
    assessedAt: now.toISOString(),
    purpose: 'current',
  });
  assert.equal(assessed.generatedCount, 0);
  assert.equal(assessed.assessments.length, 2);
  assert.ok(assessed.assessments.every((item) => item.status !== 'passes'));
  assert.equal(assessed.simulated, false);
  assert.equal(service.get(result.pack.id, result.pack.version), result.pack);
  assert.equal(
    (await service.discover({ ...input, name: 'Changed label' })).pack.id,
    result.pack.id,
  );
  assert.equal(
    service.get(result.pack.id, result.pack.version),
    result.pack,
    'Another request cannot replace a prior content version',
  );
});

test('provider outage returns empty real evidence and explicit failures, never demo fallback', async () => {
  const failing = async () => {
    throw new ProviderError('UPSTREAM_UNAVAILABLE', 'Fixture outage');
  };
  const result = await new DiscoveryService(
    { places: { discover: failing }, wind: { forecast: failing } },
    () => now,
  ).discover(input);
  assert.deepEqual(validateRegionPack(result.pack), []);
  assert.equal(result.pack.places.length, 0);
  assert.equal(result.pack.weather.length, 0);
  assert.equal(result.pack.sources.length, 0);
  assert.equal(result.providers.filter((provider) => provider.status === 'unavailable').length, 2);
  assert.equal(result.pack.validation.status, 'unreviewed');
});

test('discovery validates bounded geography and explicit dates but permits longer unknown forecast stays', () => {
  for (const bad of [
    { ...input, radiusNm: 200 },
    { ...input, center: [5, 89] },
    { ...input, from: '2026-11-03' },
    { ...input, until: '2026-11-02T12:00:00Z' },
    { ...input, name: 'x'.repeat(101) },
  ])
    assert.throws(() => validateDiscovery(bad, now), ProviderError);
  assert.equal(
    validateDiscovery({ ...input, until: '2026-11-20T12:00:00Z' }, now).until,
    '2026-11-20T12:00:00.000Z',
  );
});

test('geocoder uses submitted query and preserves attribution, without arbitrary lookup options', async () => {
  const calls: string[] = [];
  const geocoder = new NominatimProvider(
    fixture(
      [
        { display_name: 'Marseille, France', lon: '5.36', lat: '43.29' },
        { display_name: 'Invalid', lon: '', lat: null },
      ],
      calls,
    ),
  );
  const result = await geocoder.search('Marseille');
  assert.equal(result.results.length, 1);
  assert.deepEqual(result.results[0], { name: 'Marseille, France', position: [5.36, 43.29] });
  assert.match(result.attribution, /OpenStreetMap/);
  const url = new URL(calls[0]!);
  assert.equal(url.searchParams.get('q'), 'Marseille');
  assert.equal(url.searchParams.get('limit'), '5');
  assert.equal(url.searchParams.get('format'), 'jsonv2');
  await assert.rejects(geocoder.search('x'), ProviderError);
});

test('optional marine adapter cannot silently enable non-commercial hosted data in commercial mode', async () => {
  const provider = new OpenMeteoMarineProvider(fixture({}), {
    mode: 'disabled',
    endpoint: 'https://marine-api.open-meteo.com/v1/marine',
  });
  await assert.rejects(provider.forecast(input), /optional/);
  const commercial = new OpenMeteoMarineProvider(fixture({}), {
    mode: 'commercial',
    endpoint: 'https://marine-api.open-meteo.com/v1/marine',
    apiKey: 'fixture-key',
  });
  await assert.rejects(commercial.forecast(input), /customer marine endpoint/);
});

test('NWS keeps exact intervals, missing waves and dated official warnings', async () => {
  const http: HttpTransport = {
    async json<T>(url: string) {
      return {
        provenance: { ...provenance, url },
        data: (url.includes('/points/')
          ? { properties: { forecastGridData: 'https://api.weather.gov/gridpoints/KEY/1,2' } }
          : url.includes('/alerts/')
            ? {
                features: [
                  {
                    properties: {
                      event: 'Special Marine Warning',
                      onset: input.from,
                      expires: '2026-11-03T13:00:00Z',
                    },
                  },
                ],
              }
            : {
                properties: {
                  updateTime: input.from,
                  windSpeed: {
                    uom: 'wmoUnit:km_h-1',
                    values: [{ validTime: '2026-11-03T12:00:00Z/PT1H', value: 36 }],
                  },
                  waveHeight: {
                    uom: 'wmoUnit:m',
                    values: [{ validTime: '2026-11-03T12:00:00Z/PT1H', value: null }],
                  },
                },
              }) as T,
      };
    },
  };
  const result = await new NwsLiveProvider(new NwsProvider(http)).forecast({
    ...input,
    center: [-81.8, 24.55],
  });
  assert.equal(result.frames.length, 1);
  assert.equal(result.frames[0]!.waveM, null);
  assert.deepEqual(result.frames[0]!.warnings, ['Special Marine Warning']);
  assert.equal(result.frames[0]!.validUntil, '2026-11-03T13:00:00.000Z');
});

test('map proxy rejects host tricks and credentials; handles encoded glyph spaces without client credentials', async () => {
  const calls: Array<{ url: string; options: RequestInit | undefined }> = [];
  const proxy = new OpenFreeMapProxy((async (url, options) => {
    calls.push({ url: String(url), options });
    return new Response(new Uint8Array([1, 2, 3]), {
      headers: { 'content-type': 'application/x-protobuf' },
    });
  }) as typeof fetch);
  for (const url of [
    'https://tiles.openfreemap.org.evil.example/a',
    'https://user:pass@tiles.openfreemap.org/a',
    'http://tiles.openfreemap.org/a',
    'https://tiles.openfreemap.org:8443/a',
    'https://tiles.openfreemap.org/a?redirect=x',
  ])
    await assert.rejects(proxy.resource(url), ProviderError);
  assert.equal(calls.length, 0);
  const result = await proxy.resource(
    'https://tiles.openfreemap.org/fonts/Noto%20Sans%20Regular/0-255.pbf',
  );
  assert.equal(result.bytes.length, 3);
  assert.equal(result.contentType, 'application/x-protobuf');
  assert.equal(calls[0]!.options?.redirect, 'error');
  assert.match(
    (calls[0]!.options?.headers as Record<string, string>)['User-Agent']!,
    /AnchorBuddy/,
  );
  assert.equal((calls[0]!.options?.headers as Record<string, string>).Authorization, undefined);
});

test('map proxy limits bodies and propagates rate limits', async () => {
  const limited = new OpenFreeMapProxy(
    (async () =>
      new Response(null, {
        headers: { 'content-length': String(9 * 1024 * 1024) },
      })) as typeof fetch,
  );
  await assert.rejects(limited.resource('https://tiles.openfreemap.org/large'), /exceeds/);
  const throttled = new OpenFreeMapProxy(
    (async () => new Response('retry', { status: 429 })) as typeof fetch,
  );
  await assert.rejects(
    throttled.resource('https://tiles.openfreemap.org/a'),
    (error) => error instanceof ProviderError && error.status === 429,
  );
});

test('live API routes support discovery and current-time assessment with strict CORS', async (t) => {
  const app = createApp({
    now: () => now,
    discovery: live(),
    geocoder: new NominatimProvider(fixture([])),
    mapFetch: (async () =>
      new Response('{}', { headers: { 'content-type': 'application/json' } })) as typeof fetch,
  });
  t.after(() => app.close());
  const result = await app.inject({
    method: 'POST',
    url: '/v1/regions/discover',
    payload: input,
    headers: { origin: 'http://localhost:8081' },
  });
  assert.equal(result.statusCode, 200, result.body);
  const pack = result.json().pack;
  const search = await app.inject({
    method: 'POST',
    url: '/v1/search',
    payload: {
      regionId: pack.id,
      version: pack.version,
      vessel: DEFAULT_VESSEL,
      search: { ...createDefaultSearch(now), origin: input.center, maxDistanceNm: 3 },
    },
  });
  assert.equal(search.statusCode, 200, search.body);
  assert.equal(search.json().simulated, false);
  assert.equal(search.json().context.purpose, 'current');
  const invalid = await app.inject({
    method: 'POST',
    url: '/v1/regions/discover',
    payload: { ...input, radiusNm: 100 },
  });
  assert.equal(invalid.statusCode, 400);
  assert.equal((await app.inject('/v1/geocode?q=x')).statusCode, 400);
  const map = await app.inject(
    '/v1/maps/resource?url=' + encodeURIComponent('https://tiles.openfreemap.org/styles/liberty'),
  );
  assert.equal(map.statusCode, 200);
  assert.equal(
    (await app.inject('/v1/maps/resource?url=' + encodeURIComponent('https://evil.example/')))
      .statusCode,
    400,
  );
});

test('HTTP honors provider Expires and conditional revalidation while redacting source API keys', async () => {
  let clock = now.valueOf(),
    count = 0;
  const headers: Headers[] = [];
  const http = new GovernmentHttp({
    providerId: 'fixture',
    userAgent: 'fixture',
    hosts: ['fixture.example'],
    now: () => clock,
    respectServerExpiry: true,
    minIntervalMs: 0,
    fetch: (async (_url, options) => {
      count++;
      headers.push(new Headers(options?.headers));
      return count === 1
        ? new Response('{"ok":true}', {
            headers: {
              expires: new Date(clock + 7200000).toUTCString(),
              'last-modified': now.toUTCString(),
            },
          })
        : new Response(null, { status: 304, headers: { 'cache-control': 'max-age=3600' } });
    }) as typeof fetch,
  });
  const url = 'https://fixture.example/data?apikey=do-not-return';
  const initial = await http.json(url);
  assert.ok(!initial.provenance.url.includes('do-not-return'));
  clock += 3600000;
  await http.json(url);
  assert.equal(count, 1);
  clock += 3600001;
  const revalidated = await http.json(url);
  assert.equal(count, 2);
  assert.deepEqual(revalidated.data, { ok: true });
  assert.equal(headers[1]!.get('if-modified-since'), now.toUTCString());
});

test('HTTP uses bounded POST form queries and respects upstream Retry-After without retrying', async () => {
  let count = 0;
  let clock = now.valueOf();
  let observed: RequestInit | undefined;
  let address = '';
  const http = new GovernmentHttp({
    providerId: 'fixture',
    userAgent: 'AnchorBuddy fixture',
    hosts: ['fixture.example'],
    postForm: true,
    now: () => clock,
    minIntervalMs: 0,
    fetch: (async (url, options) => {
      count++;
      observed = options;
      address = String(url);
      return count === 1
        ? new Response('quota', { status: 429, headers: { 'retry-after': '120' } })
        : new Response('{"elements":[]}');
    }) as typeof fetch,
  });
  await assert.rejects(
    http.json('https://fixture.example/interpreter?data=bounded-query'),
    (error) => error instanceof ProviderError && error.status === 429,
  );
  assert.equal(observed?.method, 'POST');
  assert.equal(address, 'https://fixture.example/interpreter');
  assert.equal(String(observed?.body), 'data=bounded-query');
  await assert.rejects(
    http.json('https://fixture.example/interpreter?data=other-query'),
    /cooldown/,
  );
  assert.equal(count, 1);
  clock += 120001;
  await http.json('https://fixture.example/interpreter?data=bounded-query');
  assert.equal(count, 2);
});
