import { test, expect, type Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { createDefaultSearch, createVesselDraft, type Position } from '@anchor-buddy/domain';
import { createDemoPack } from '@anchor-buddy/domain/testing';
import { createEmptyRegion, type RegionalData } from '../../src/lib/regionalDataCore';

const center: Position = [18.65, 54.35];
const search = createDefaultSearch(center);
const vessel = { ...createVesselDraft(), name: 'Recovery test vessel', lengthM: 10, beamM: 3,
  loadedDraftM: 1.5, displacementKg: 4000,
  anchor: { ...createVesselDraft().anchor, type: 'other', usableLengthM: 60, bowRollerHeightM: 0 } };
const settings = { schemaVersion: 2, kind: 'settings', id: 'local-settings', revision: 'recovery-test',
  savedAt: new Date().toISOString(), payload: { vessel, searchDefaults: search, units: 'metric', offline: false,
    layers: { depth: true, bedding: true, marks: true }, language: 'en', confirmed: { vessel: true, defaults: true }, setupComplete: true } };
const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name, exact: typeof name === 'string' });
const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true });
const storageKey = (name: string) => `anchorai:v1:${name}`;
function deferred() { let release = () => {}; const promise = new Promise<void>(resolve => { release = resolve; }); return { promise, release }; }
function evidence(id: string, retention: 'retained' | 'automatic' = 'retained'): RegionalData {
  const pack = createEmptyRegion(center, 6, `Retained test evidence ${id}`);
  pack.id = id; pack.generatedAt = '2026-01-01T00:00:00.000Z'; pack.validUntil = '2026-01-02T00:00:00.000Z';
  pack.sources = [{ id: 'controlled-source', name: 'Intercepted test source', url: 'https://fixture.invalid/source',
    retrievedAt: pack.generatedAt, validUntil: pack.validUntil, attribution: 'Browser test only', license: 'Fixture', synthetic: false }];
  return { pack, providers: [], notices: [], partial: true, retention, savedAt: '2026-01-01T01:00:00.000Z' };
}
async function initialize(page: Page, baseURL: string, values: Record<string, unknown> = {}) {
  await page.route('**/*', route => new URL(route.request().url()).origin === baseURL ? route.continue() : route.abort());
  await page.addInitScript(({ settings, values, baseURL }) => {
    if (localStorage.getItem('anchorai:v1:settings-v2')) return;
    localStorage.setItem('anchorai:v1:settings-v2', JSON.stringify(settings));
    localStorage.setItem('anchorai:v1:provider-api-url', JSON.stringify(baseURL));
    for (const [key, value] of Object.entries(values)) localStorage.setItem('anchorai:v1:' + key, JSON.stringify(value));
  }, { settings, values, baseURL });
  await page.goto('/');
  await expect(page.getByText('No active search', { exact: true })).toBeVisible();
}
async function submitSearch(page: Page) {
  await button(page, 'Plan a stay').click();
  await button(page, 'Enter coordinates').click();
  await field(page, 'Latitude').fill(String(center[1]));
  await field(page, 'Longitude').fill(String(center[0]));
  await button(page, 'Search this area').click();
}

test('expired retained evidence survives provider failure, offline intent, and reconnect', async ({ page, context, baseURL }, info) => {
  const retained = evidence('retained-expired');
  await initialize(page, baseURL!, { 'regional-evidence-v1': [retained] });
  let requests = 0;
  const started = deferred(), release = deferred();
  await page.route('**/v1/regions/discover', async route => {
    requests++; started.release(); await release.promise;
    await route.fulfill({ status: 503, json: { message: 'Controlled provider unavailable' } }).catch(() => {});
  });
  await submitSearch(page); await started.promise;
  await expect(page.getByText(/Evidence expired or expiry unavailable/)).toBeVisible();
  await expect(page.getByText(/Refreshing; available evidence keeps its original dates/)).toBeVisible();
  release.release();
  await expect(page.getByText(/Previously downloaded evidence is retained with its original dates/)).toBeVisible();
  await expect(button(page, 'Refresh sources')).toBeDisabled();
  expect(JSON.parse(await page.evaluate(key => localStorage.getItem(key), storageKey('regional-evidence-v1')) as string)).toEqual([retained]);
  await context.setOffline(true);
  await expect(page.getByText(/No network connection · Evidence expired/)).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText(/Network connected · Evidence expired/)).toBeVisible();
  expect(requests).toBe(1);
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Offline planning', exact: true }).click();
  await page.getByRole('tab', { name: 'Explore', exact: true }).click();
  await expect(page.getByText(/Offline planning enabled · Evidence expired/)).toBeVisible();
  await expect(button(page, 'Refresh sources')).toBeDisabled();
  await info.attach('retained-expired-offline', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('protected evidence quota failure preserves bytes and explicit cleanup permits retry', async ({ page, baseURL }) => {
  const retained = Array.from({ length: 8 }, (_, i) => evidence(`protected-${i}`));
  await initialize(page, baseURL!, { 'regional-evidence-v1': retained });
  const loaded = evidence('new-live', 'automatic');
  await page.route('**/v1/regions/discover', route => route.fulfill({ json: loaded }));
  await submitSearch(page);
  await expect(page.getByText(/Live data loaded, but could not be cached/)).toBeVisible();
  expect(JSON.parse(await page.evaluate(key => localStorage.getItem(key), storageKey('regional-evidence-v1')) as string)).toEqual(retained);
  await page.getByRole('tab', { name: 'Saved', exact: true }).click();
  await button(page, 'Allow automatic cleanup').first().click();
  await expect(button(page, 'Keep for offline use')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Explore', exact: true }).click();
  // A new submitted search is an explicit action, independent of the refresh cooldown.
  await button(page, 'Edit').click();
  await button(page, 'Search this area').click();
  await expect(page.getByText(/Live data loaded, but could not be cached/)).toHaveCount(0);
  await expect.poll(async () => JSON.parse(await page.evaluate(key => localStorage.getItem(key), storageKey('regional-evidence-v1')) as string).some((row: RegionalData) => row.pack.id === 'new-live')).toBe(true);
  const after: RegionalData[] = JSON.parse(await page.evaluate(key => localStorage.getItem(key), storageKey('regional-evidence-v1')) as string);
  expect(after).toHaveLength(8);
  expect(after.filter(row => row.retention === 'retained')).toHaveLength(7);
  await page.reload(); await page.getByRole('tab', { name: 'Saved', exact: true }).click();
  await expect(page.getByText('Retained test evidence new-live', { exact: true })).toBeVisible();
});

test('regional cancellation preserves the old pointer and lost activation acknowledgement reconciles', async ({ page, baseURL }, info) => {
  // This integrity fixture is test-only; it is never included in the exported runtime.
  const pack = createDemoPack();
  pack.version = 'browser-fixture-v1'; pack.validation.status = 'reviewed';
  pack.validation.reviewedBy = 'Browser test fixture only'; pack.validation.reviewedAt = pack.generatedAt;
  pack.sources = pack.sources.map(source => ({ ...source, synthetic: false }));
  const bytes = Buffer.from(JSON.stringify(pack));
  const manifest = { schemaVersion: 1, regionId: pack.id, version: pack.version, createdAt: pack.generatedAt,
    validUntil: pack.validUntil, bounds: pack.bounds, synthetic: false, releaseStatus: 'reviewed',
    review: { maritime: true, coverage: true, geometry: true, stationMappings: true, onWaterValidation: true,
      reviewedBy: 'Browser fixture, not real approval', reviewedAt: pack.generatedAt },
    assets: [{ path: 'assessment.json', purpose: 'assessment', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }] };
  const previous = { pack: evidence('previous-pack').pack, savedAt: '2026-01-01T01:00:00.000Z' };
  await initialize(page, baseURL!, { 'active-region': previous });
  await page.route('**/v1/regions', route => route.fulfill({ json: { regions: [{ id: pack.id, version: pack.version, label: 'Test fixture region', releaseStatus: 'reviewed', synthetic: false }] } }));
  await page.route('**/manifest?**', route => route.fulfill({ json: manifest }));
  let release = deferred(), started = deferred(), hold = true;
  await page.route('**/assets/assessment.json', async route => {
    started.release(); if (hold) await release.promise;
    await route.fulfill({ body: bytes, contentType: 'application/json' }).catch(() => {});
  });
  const connect = async () => {
    await page.getByRole('tab', { name: 'Settings', exact: true }).click();
    await button(page, 'Data connection').click();
    await button(page, 'Connect & check regions').click();
    await expect(button(page, 'Download reviewed region')).toBeEnabled();
  };
  await connect(); await button(page, 'Download reviewed region').click(); await started.promise;
  await button(page, 'Cancel regional operation').click(); release.release();
  await expect(page.getByText(/Regional operation cancelled/)).toBeVisible();
  expect(JSON.parse(await page.evaluate(key => localStorage.getItem(key), storageKey('active-region')) as string)).toEqual(previous);
  release = deferred(); started = deferred();
  await button(page, 'Download reviewed region').click(); await started.promise;
  await page.getByRole('tab', { name: 'Saved', exact: true }).click(); release.release();
  await connect();
  expect(JSON.parse(await page.evaluate(key => localStorage.getItem(key), storageKey('active-region')) as string)).toEqual(previous);
  hold = false;
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      original.call(this, key, value);
      if (key === 'anchorai:v1:active-region') {
        Storage.prototype.setItem = original;
        throw new Error('Controlled lost commit acknowledgement');
      }
    };
  });
  await button(page, 'Download reviewed region').click();
  await expect(page.getByText(/Verified regional analysis installed/)).toBeVisible();
  const current = JSON.parse(await page.evaluate(key => localStorage.getItem(key), storageKey('active-region')) as string);
  expect(current.pack.version).toBe(pack.version);
  expect(await page.evaluate(async key => (await caches.keys()).includes('anchorai-regional-assets-v2-' + key), current.assetKey)).toBe(true);
  await page.reload(); await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  await expect(page.getByText(pack.name, { exact: true })).toBeVisible();
  await info.attach('activated-after-ack-failure', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});
