import {
  chromium,
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page,
  type TestInfo,
} from '@playwright/test';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Position } from '@anchor-buddy/domain';
import { createEmptyRegion } from '../src/lib/regionalDataCore';

const longName =
  'Northern Harbour and Coastal Nature Reserve near the Outer Marina and River Mouth';
const sourceName =
  'Regional coastal observations and harbour availability evidence with a deliberately long provider name';
const button = (root: Page | Locator, name: string | RegExp) =>
  root.getByRole('button', { name, exact: typeof name === 'string' });
const field = (root: Page | Locator, name: string) =>
  root.getByRole('textbox', { name, exact: true });
const graphicsArgs = [
  '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
  '--no-proxy-server',
  '--enable-unsafe-swiftshader',
  '--use-angle=swiftshader',
];

test.use({ actionTimeout: 10_000, launchOptions: { args: graphicsArgs } });

async function fixtures(context: BrowserContext, origin: string) {
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.origin === origin && !url.pathname.startsWith('/v1/')
      ? route.continue()
      : route.abort('blockedbyclient');
  });
  await context.route('**/v1/geocode?*', (route) =>
    route.fulfill({ json: { results: [{ name: longName, position: [18.65, 54.35] }] } }),
  );
  await context.route('**/v1/regions', (route) =>
    route.fulfill({ status: 503, json: { message: 'Controlled provider unavailable response' } }),
  );
  await context.route('**/v1/regions/discover', (route) => {
    const { center, radiusNm } = route.request().postDataJSON() as {
      center: Position;
      radiusNm: number;
    };
    const pack = createEmptyRegion(center, radiusNm, longName);
    pack.sources = [
      {
        id: 'q38-source',
        name: sourceName,
        url: 'https://fixture.invalid/evidence',
        retrievedAt: pack.generatedAt,
        validUntil: pack.validUntil,
        attribution: 'Q38 intercepted browser fixture',
        license: 'Test fixture',
        synthetic: false,
      },
    ];
    pack.places = [
      {
        id: 'q38-place',
        name: longName,
        kind: 'anchorage',
        position: center,
        feeStatus: 'unknown',
        sourceIds: ['q38-source'],
        overnightAllowed: null,
        availability: 'unknown',
        holding: 'unknown',
        facilities: [],
        notes: ['No confirmed depth, weather or availability is supplied by this fixture.'],
      },
    ];
    return route.fulfill({
      json: {
        pack,
        providers: [
          {
            id: 'q38-source',
            name: sourceName,
            status: 'partial',
            message: 'Depth, seabed, weather and availability are unavailable.',
            retrievedAt: pack.generatedAt,
            validUntil: pack.validUntil,
          },
        ],
        partial: true,
        notices: [
          'Controlled partial response. Depth, seabed and weather coverage are unavailable.',
        ],
      },
    });
  });
}

async function reachable(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  await expect(locator).toBeInViewport();
  const box = (await locator.boundingBox())!;
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
}

async function capture(page: Page, info: TestInfo, state: string, primary?: Locator) {
  if (primary) {
    await reachable(primary);
    const bounds = await primary.evaluate((element) => {
      const records = [];
      let node: HTMLElement | null = element as HTMLElement;
      while (node) {
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        records.push({
          tag: node.tagName,
          role: node.getAttribute('role'),
          text: node.textContent?.slice(0, 100),
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          scrollHeight: node.scrollHeight,
          clientHeight: node.clientHeight,
          scrollTop: node.scrollTop,
          overflowY: style.overflowY,
          overflowX: style.overflowX,
        });
        node = node.parentElement;
      }
      return records;
    });
    await writeFile(info.outputPath(state + '-bounds.json'), JSON.stringify(bounds, null, 2));
  }
  const measurement = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    pixelRatio: devicePixelRatio,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(measurement.documentWidth, state + ' document overflow').toBeLessThanOrEqual(
    measurement.width + 1,
  );
  expect(measurement.bodyWidth, state + ' body overflow').toBeLessThanOrEqual(
    measurement.width + 1,
  );
  const path = info.outputPath(state + '.png');
  await page.screenshot({ path, animations: 'disabled' });
  await info.attach(state, { path, contentType: 'image/png' });
  await writeFile(info.outputPath(state + '-viewport.json'), JSON.stringify(measurement, null, 2));
  await info.attach(state + '-viewport', {
    body: JSON.stringify(measurement),
    contentType: 'application/json',
  });
  await info.attach(state + '-accessibility', {
    body: await page.locator('body').ariaSnapshot(),
    contentType: 'text/plain',
  });
}

async function journey(page: Page, info: TestInfo) {
  await page.goto('/');
  await expect(button(page, 'Continue to app tour')).toBeDisabled();
  await capture(page, info, 'setup', button(page, 'Configure vessel'));
  await button(page, 'Configure vessel').press('Enter');
  const vessel = page.getByRole('dialog', { name: 'Configure your vessel', exact: true });
  await expect(button(vessel, 'Close dialog')).toBeFocused();
  await field(vessel, 'Vessel name').fill('');
  await button(vessel, 'Save vessel & continue').click();
  await expect(field(vessel, 'Vessel name')).toBeFocused();
  await expect(field(vessel, 'Vessel name')).toHaveAttribute('aria-invalid', 'true');
  await expect(field(vessel, 'Vessel name')).toHaveAccessibleDescription(/Vessel name is required/);
  await capture(page, info, 'vessel-error', button(vessel, 'Save vessel & continue'));
  for (const [name, value] of Object.entries({
    'Vessel name': longName,
    'Length overall': '10',
    Beam: '3.2',
    'Loaded draft': '1.6',
    Displacement: '5000',
    'Usable rode length': '55',
    'Bow roller above water': '1',
  }))
    await field(vessel, name).fill(value);
  const anchor = vessel.getByRole('combobox', { name: 'Anchor design', exact: true });
  await anchor.focus();
  await anchor.press('Home');
  const scoop = vessel.getByRole('option', { name: 'Modern scoop', exact: true });
  await expect(anchor).toBeFocused();
  await expect(anchor).toHaveAttribute('aria-activedescendant', (await scoop.getAttribute('id'))!);
  await anchor.press('Enter');
  await expect(anchor).toBeFocused();
  await expect(anchor).toContainText('Modern scoop');
  await button(vessel, 'Save vessel & continue').click();
  await button(page, 'Configure defaults').click();
  await button(page, 'Save defaults').click();
  await button(page, 'Continue to app tour').click();
  await button(page, 'Skip tour').click();
  await capture(page, info, 'empty-explore', button(page, 'Plan a stay'));
  const opener = button(page, 'Plan a stay');
  await opener.press('Enter');
  const search = page.getByRole('dialog', { name: 'Plan the stay', exact: true });
  await expect(button(search, 'Close dialog')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(button(search, 'Search this area')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(button(search, 'Close dialog')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await opener.press('Enter');
  const date = search.getByRole('button', { name: /^Arrival date:/ });
  const dateName = await date.getAttribute('aria-label');
  await date.press('Enter');
  const calendar = search.getByRole('grid', { name: /Arrival calendar/ });
  await expect(calendar).toBeVisible();
  await expect(calendar.getByRole('gridcell', { selected: true })).toHaveCount(1);
  const originalDay = await page.locator(':focus').getAttribute('aria-label');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator(':focus')).not.toHaveAttribute('aria-label', originalDay!);
  await capture(page, info, 'calendar', button(search, 'Close dialog'));
  await page.keyboard.press('Escape');
  await expect(date).toBeFocused();
  await expect(date).toHaveAttribute('aria-label', dateName!);
  await button(search, 'Search this area').click();
  await expect(search.getByText(/Choose a coastal region, find a location/)).toBeVisible();
  await field(search, 'Town, harbour or address').fill('Harbour');
  await field(search, 'Town, harbour or address').press('Enter');
  await button(search, 'Use ' + longName).click();
  await expect(search.getByText('Selected area · ' + longName, { exact: true })).toBeVisible();
  await button(search, 'Operating limits').click();
  await field(search, 'Sustained wind').fill('18');
  await button(search, 'Operating limits').click();
  await capture(page, info, 'search-long-name', button(search, 'Search this area'));
  await button(search, 'Search this area').click();
  await expect(
    page.getByText('1 place records · 0 forecast intervals. Open sources for missing coverage.', {
      exact: true,
    }),
  ).toBeVisible();
  await button(page, 'List view').click();
  await expect(button(page, 'List view')).toHaveAttribute('aria-pressed', 'true');
  const result = button(page, new RegExp('^' + longName + '\\. Rank 1\\.'));
  await capture(page, info, 'list-long-name', result);
  await button(page, /Advanced filters & sorting/).click();
  const filters = page.getByRole('dialog', { name: 'Advanced filters & sorting', exact: true });
  await filters.getByRole('combobox', { name: 'Price', exact: true }).click();
  await filters.getByRole('option', { name: 'Confirmed free', exact: true }).click();
  await button(filters, 'Apply').click();
  await expect(
    page.getByText('Result filters hide available positions', { exact: true }),
  ).toBeVisible();
  await capture(page, info, 'filters-hide-results', button(page, 'Reset result filters').last());
  await button(page, 'Reset result filters').last().click();
  await expect(result).toBeVisible();
  await button(page, /^Edit(?: search)?$/).click();
  await expect(button(search, 'Operating limits')).toHaveAccessibleDescription(/18 kt/);
  await expect(field(search, 'Search radius')).toHaveValue('3');
  await button(search, 'Close dialog').click();
  await result.press('Enter');
  const detail = page.getByRole('dialog', { name: longName, exact: true });
  await expect(button(detail, 'Close dialog')).toBeFocused();
  await expect(detail.getByText('Evidence gaps', { exact: true })).toBeVisible();
  await capture(
    page,
    info,
    'detail-missing-evidence',
    button(detail, /Plan this position|Inspect position in planner/),
  );
  await button(detail, /Sources & freshness/).click();
  await capture(
    page,
    info,
    'detail-source-long-name',
    detail.getByText(sourceName, { exact: true }),
  );
  await button(detail, 'Close dialog').click();
  await expect(result).toBeFocused();
  await button(page, /Sources & coverage/).click();
  const sources = page.getByRole('dialog', { name: 'Area data & coverage', exact: true });
  await expect(sources.getByText(sourceName + ' · partial', { exact: true })).toBeVisible();
  await capture(
    page,
    info,
    'sources-long-name',
    sources.getByText(sourceName + ' · partial', { exact: true }),
  );
  await reachable(button(sources, 'Close dialog'));
  await button(sources, 'Close dialog').click();
  await button(page, 'Map view').click();
  await expect(button(page, 'Map view')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Some map detail is unavailable', { exact: true })).toBeVisible();
  await capture(page, info, 'map-unavailable', button(page, 'Choose anchor position on map'));
  await capture(page, info, 'map-canvas-reachable', page.locator('.maplibregl-canvas'));
  const marker = button(page, new RegExp('^Select ' + longName + '\\. Rank 1\\.'));
  await marker.click();
  await button(page.getByRole('dialog', { name: longName, exact: true }), 'Close dialog').click();
  await expect(marker).toHaveAttribute('aria-pressed', 'true');
  await capture(page, info, 'map-selected-overlay', marker);
  await capture(page, info, 'map-selected-card', button(page, new RegExp('^' + longName)).last());
  await button(page, 'List view').click();
  await button(page, 'Save results').click();
  const save = page.getByRole('dialog', { name: 'Save search results', exact: true });
  await field(save, 'Search name').fill(longName);
  await capture(page, info, 'save-dialog', button(save, 'Save results'));
  await button(save, 'Save results').click();
  await page.getByRole('tab', { name: 'Saved', exact: true }).click();
  await capture(page, info, 'saved-long-name', button(page, 'View saved snapshot'));
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  await button(page, 'Data connection').press('Enter');
  await button(page, 'Connect & check regions').click();
  await expect(page.getByRole('alert')).toContainText('Could not reach the regional API');
  await capture(page, info, 'settings-error', button(page, 'Connect & check regions'));
  await page.getByRole('tab', { name: 'Explore', exact: true }).click();
  await button(page, 'List view').click();
  await result.click();
  await button(
    page.getByRole('dialog', { name: longName, exact: true }),
    /Plan this position|Inspect position in planner/,
  ).click();
  await expect(page.getByRole('heading', { name: 'Anchor plan', exact: true })).toBeVisible();
  await capture(page, info, 'planner-warning', button(page, 'Review assessment & sources'));
  await capture(page, info, 'planner-watch-action', button(page, 'View anchor watch requirements'));
  await button(page, 'View anchor watch requirements').click();
  await expect(
    page.getByRole('heading', { name: 'Native watch unavailable', exact: true }),
  ).toBeVisible();
  await capture(page, info, 'watch-unavailable', button(page, 'Back to anchor plan'));
  expect(await page.pageErrors(), 'Uncaught browser errors').toEqual([]);
}

for (const width of [320, 390, 768, 1280]) {
  test(`responsive accessible journey at ${width} CSS pixels`, async ({
    context,
    page,
    baseURL,
  }, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: width < 768 ? 844 : 900 });
    await fixtures(context, baseURL!);
    await journey(page, info);
  });
}

test('responsive accessible journey at actual 200 percent browser zoom', async ({
  baseURL,
}, info) => {
  test.setTimeout(120_000);
  const directory = await mkdtemp(join(tmpdir(), 'anchor-q38-zoom-'));
  const extension = join(directory, 'extension');
  await mkdir(extension);
  await writeFile(
    join(extension, 'manifest.json'),
    JSON.stringify({
      manifest_version: 3,
      name: 'Isolated Q38 zoom verification',
      version: '1.0.0',
      permissions: ['tabs'],
      background: { service_worker: 'worker.js' },
    }),
  );
  await writeFile(
    join(extension, 'worker.js'),
    'chrome.runtime.onInstalled.addListener(() => {});',
  );
  const context = await chromium.launchPersistentContext(join(directory, 'profile'), {
    channel: 'chromium',
    viewport: { width: 1280, height: 900 },
    serviceWorkers: 'block',
    args: [
      ...graphicsArgs,
      '--disable-extensions-except=' + extension,
      '--load-extension=' + extension,
    ],
  });
  try {
    await fixtures(context, baseURL!);
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(baseURL!);
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const zoom = await worker.evaluate(async (origin) => {
      // The extension owns the real browser tab zoom. No CSS transform or device emulation is used.
      const tabs = (globalThis as any).chrome.tabs;
      const [tab] = await tabs.query({ url: origin + '/*' });
      await tabs.setZoom(tab.id, 2);
      return tabs.getZoom(tab.id);
    }, baseURL!);
    expect(zoom).toBe(2);
    await expect
      .poll(() =>
        page.evaluate(() => ({
          width: innerWidth,
          height: innerHeight,
          pixelRatio: devicePixelRatio,
        })),
      )
      .toEqual({ width: 640, height: 450, pixelRatio: 2 });
    const zoomMeasurement = {
      hostViewport: { width: 1280, height: 900 },
      hostWindow: await page.evaluate(() => ({ width: outerWidth, height: outerHeight })),
      zoomFactor: zoom,
      effectiveViewport: await page.evaluate(() => ({
        width: innerWidth,
        height: innerHeight,
        pixelRatio: devicePixelRatio,
      })),
    };
    await writeFile(
      info.outputPath('actual-browser-zoom.json'),
      JSON.stringify(zoomMeasurement, null, 2),
    );
    await info.attach('actual-browser-zoom', {
      body: JSON.stringify(zoomMeasurement),
      contentType: 'application/json',
    });
    await journey(page, info);
  } finally {
    await context.close();
    await rm(directory, { recursive: true, force: true });
  }
});
