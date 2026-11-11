import assert from 'node:assert/strict';
import test from 'node:test';
import {
  capabilityDeploymentFromEnvironment,
  parseProviderCapabilityArea,
  PROVIDER_PRODUCTS,
  resolveProviderCapabilities,
  validateProviderRegistry,
  type ProviderCapabilityArea,
} from '../src/providers/capabilities.js';
import { PROVIDERS, type ProviderCapabilityReport } from '../src/providers/contracts.js';
import { EmodnetContextProvider } from '../src/providers/emodnet-context.js';

const split: ProviderCapabilityArea = { center: [16.44, 43.51], radiusNm: 2 };
const singapore: ProviderCapabilityArea = { center: [103.86, 1.28], radiusNm: 3 };
const defaultDeployment = capabilityDeploymentFromEnvironment({});

function product(report: ProviderCapabilityReport, id: string) {
  const match = report.capabilities.products.find(({ productId }) => productId === id);
  assert.ok(match, id);
  return match;
}

test('DATA-01-T01: default Split capabilities distinguish products, pending adapters and evidence', () => {
  const report = resolveProviderCapabilities(defaultDeployment, split);
  assert.equal(report.capabilities.schemaVersion, 2);
  assert.deepEqual(
    report.providers.map(({ id }) => id),
    PROVIDERS.map(({ id }) => id),
  );
  assert.equal(new Set(report.providers.map(({ id }) => id)).size, report.providers.length);
  assert.deepEqual(
    new Set(report.capabilities.products.map(({ providerId }) => providerId)),
    new Set(report.providers.map(({ id }) => id)),
  );

  assert.equal(product(report, 'met-locationforecast-wind').role, 'point-forecast');
  assert.equal(product(report, 'met-locationforecast-wind').status, 'available');
  assert.equal(product(report, 'met-oceanforecast-waves').status, 'not-covered');
  assert.equal(product(report, 'osm-overpass-europe').status, 'available');
  assert.equal(product(report, 'osm-overpass-global').routing, 'not-selected');
  assert.equal(product(report, 'nws-marine-grid').status, 'not-covered');

  for (const id of ['emodnet-dtm-context', 'emodnet-seabed-context']) {
    const context = product(report, id);
    assert.equal(context.role, 'scientific-context');
    assert.equal(context.status, 'available');
    assert.equal(context.statusBasis, 'configuration');
    assert.equal(context.rights.offlineStorage.status, 'unknown');
    assert.equal(context.rights.analysis.status, 'unknown');
  }
  const basemap = product(report, 'openfreemap-world-basemap');
  assert.equal(basemap.role, 'chart-display');
  assert.equal(basemap.rights.onlineDisplay.status, 'permitted');
  assert.equal(basemap.rights.offlineStorage.status, 'permitted');
  assert.equal(basemap.rights.analysis.status, 'unknown');

  for (const id of [
    'open-meteo-marine-waves',
    'noaa-enc-regional-analysis',
    'noaa-coops-tide-predictions',
    'noaa-coops-current-predictions',
    'regional-display-tiles',
    'chatgpt-subscription-assistant',
  ]) {
    assert.equal(product(report, id).status, 'disabled');
  }
  assert.equal(product(report, 'chatgpt-subscription-assistant').implementation, 'pending');
});

test('DATA-01-T02: EMODnet outside its routing extent makes zero requests', async () => {
  let requests = 0;
  const emodnet = new EmodnetContextProvider({
    async json() {
      requests++;
      throw new Error('outside request must never reach transport');
    },
  });
  const observation = await emodnet.sample(singapore);
  assert.equal(observation.status.status, 'not-covered');
  assert.equal(requests, 0);
  const report = resolveProviderCapabilities(defaultDeployment, singapore, {
    'emodnet-dtm-context': 'available',
  });
  for (const id of ['emodnet-dtm-context', 'emodnet-seabed-context']) {
    assert.equal(product(report, id).status, 'not-covered');
    assert.equal(product(report, id).routing, 'outside');
    assert.equal(product(report, id).statusBasis, 'routing');
  }
  assert.equal(product(report, 'osm-overpass-global').status, 'available');
});

test('DATA-01-T03: reports and validation errors omit secret configuration and entitlement data', () => {
  const sentinel = ['fake', 'test', 'secret', 'never', 'echo'].join('_');
  const endpoint = 'https://geocode.example.test/' + sentinel;
  const env = {
    OPEN_METEO_MODE: 'commercial',
    OPEN_METEO_API_KEY: sentinel,
    NOMINATIM_URL: endpoint,
    OVERPASS_URL: 'https://overpass.example.test/' + sentinel,
    CHATGPT_CLIENT_SECRET: sentinel,
  };
  const config = capabilityDeploymentFromEnvironment(env);
  const descriptors = structuredClone(PROVIDER_PRODUCTS);
  descriptors[0]!.rights.analysis.entitlementId = sentinel;
  Object.assign(descriptors[0]!, { reviewerId: sentinel });
  const report = resolveProviderCapabilities(config, split, {}, descriptors);
  assert.equal(JSON.stringify({ config, report }).includes(sentinel), false);
  assert.equal(JSON.stringify(report).includes('geocode.example.test'), false);
  assert.equal(product(report, 'met-locationforecast-wind').rights.analysis.entitlementId, null);
  assert.deepEqual(product(report, 'open-meteo-marine-waves').authentication, {
    mode: 'api-key',
    credential: 'configured',
  });
  assert.equal(product(report, 'open-meteo-marine-waves').rights.analysis.status, 'unknown');
  assert.equal(
    product(report, 'nominatim-submitted-search').rights.offlineStorage.status,
    'unknown',
  );
  assert.equal(report.providers.find(({ id }) => id === 'nominatim')?.offline.allowed, false);
  assert.equal(product(report, 'chatgpt-subscription-assistant').status, 'disabled');

  Object.assign(descriptors[0]!, {
    sourceUrl: 'https://fixture.example/policy?api_key=' + sentinel,
  });
  assert.throws(
    () => validateProviderRegistry(descriptors),
    (error: unknown) =>
      error instanceof Error &&
      /Provider met-norway: invalid public source URL/.test(error.message) &&
      !error.message.includes(sentinel),
  );
});

test('DATA-01-T04: rejects unproven rights, unknown enums and malformed entries', () => {
  const checked = () => structuredClone(PROVIDER_PRODUCTS);
  const missingPolicy = checked();
  missingPolicy[0]!.rights.offlineStorage.policyUrl = null;
  assert.throws(() => validateProviderRegistry(missingPolicy), /met-norway.*offlineStorage/);
  const missingDate = checked();
  missingDate[0]!.rights.offlineStorage.verifiedAt = null;
  assert.throws(() => validateProviderRegistry(missingDate), /met-norway.*offlineStorage/);

  for (const role of ['invented', ['point-forecast'], null]) {
    const invalidRole = checked();
    Object.assign(invalidRole[0]!, { role });
    assert.throws(() => validateProviderRegistry(invalidRole), /met-norway.*role/);
  }
  for (const sourceUrl of [
    'not a URL',
    'http://example.test',
    'https://local.internal',
    'https://name@example.test',
  ]) {
    const invalidUrl = checked();
    Object.assign(invalidUrl[0]!, { sourceUrl });
    assert.throws(() => validateProviderRegistry(invalidUrl), /met-norway.*public source URL/);
  }
  const noAttribution = checked();
  Object.assign(noAttribution[0]!, { attribution: ' ' });
  assert.throws(() => validateProviderRegistry(noAttribution), /met-norway.*attribution/);
  assert.throws(
    () => validateProviderRegistry([...checked(), checked()[0]!]),
    /met-norway.*duplicate product ID/,
  );
  assert.throws(
    () =>
      validateProviderRegistry(checked().filter(({ providerId }) => providerId !== 'met-norway')),
    /met-norway.*missing product/,
  );
});

test('DATA-01-T05: canonical results and product-level partial/unavailable observations', () => {
  const observed = {
    'emodnet-dtm-context': 'unavailable',
    'emodnet-seabed-context': 'partial',
    'open-meteo-marine-waves': 'available',
  } as const;
  const first = resolveProviderCapabilities(defaultDeployment, split, observed);
  const reversed = [...PROVIDER_PRODUCTS].reverse();
  const second = resolveProviderCapabilities(defaultDeployment, split, observed, reversed);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(product(first, 'emodnet-dtm-context').status, 'unavailable');
  assert.equal(product(first, 'emodnet-seabed-context').status, 'partial');
  assert.equal(product(first, 'emodnet-seabed-context').statusBasis, 'response');
  assert.equal(product(first, 'open-meteo-marine-waves').status, 'disabled');
});

test('optional deployment mode, licensed host and credential gates are independent', () => {
  const wave = (env: NodeJS.ProcessEnv) =>
    product(
      resolveProviderCapabilities(capabilityDeploymentFromEnvironment(env), split),
      'open-meteo-marine-waves',
    );
  const testKey = ['fixture', 'credential'].join('_');
  assert.equal(wave({ OPEN_METEO_API_KEY: testKey }).status, 'disabled');
  assert.equal(wave({ OPEN_METEO_MODE: 'commercial' }).status, 'disabled');
  assert.equal(
    wave({
      OPEN_METEO_MODE: 'commercial',
      OPEN_METEO_API_KEY: testKey,
      OPEN_METEO_MARINE_URL: 'https://marine-api.open-meteo.com/v1/marine',
    }).status,
    'disabled',
  );
  assert.equal(
    wave({
      OPEN_METEO_MODE: 'self-hosted',
      OPEN_METEO_MARINE_URL: 'https://marine.example.test/v1/marine',
    }).status,
    'available',
  );
  const production = resolveProviderCapabilities(
    capabilityDeploymentFromEnvironment({ NODE_ENV: 'production' }),
    split,
  );
  assert.equal(product(production, 'osm-overpass-europe').status, 'disabled');
  assert.equal(product(production, 'met-locationforecast-wind').status, 'available');
});

test('provider area parser matches discovery coordinate and radius semantics', () => {
  assert.deepEqual(parseProviderCapabilityArea({}), { status: 'valid' });
  assert.deepEqual(
    parseProviderCapabilityArea({
      latitude: '43.51234',
      longitude: '16.44127',
      radiusNm: '2.1254',
    }),
    { status: 'valid', area: { center: [16.4413, 43.5123], radiusNm: 2.125 } },
  );
  assert.deepEqual(parseProviderCapabilityArea({ latitude: '0', longitude: '0' }), {
    status: 'valid',
    area: { center: [0, 0], radiusNm: 0.25 },
  });
  for (const query of [
    null,
    { latitude: '1.2' },
    { longitude: '-180', latitude: '85.0001' },
    { longitude: '-180', latitude: '85', radiusNm: '26' },
    { longitude: '-180', latitude: '85', radiusNm: '' },
    { longitude: ['-180', '180'], latitude: '85' },
    { longitude: '0x10', latitude: '85' },
  ]) {
    assert.deepEqual(parseProviderCapabilityArea(query), { status: 'invalid' });
  }
});
