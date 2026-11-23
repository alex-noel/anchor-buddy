import { expect, test, type Page, type TestInfo } from '@playwright/test';
import type { Position } from '@anchor-buddy/domain';
import { createEmptyRegion } from '../src/lib/regionalDataCore';

const center: Position = [18.65, 54.35];
const button = (page: Page, name: string | RegExp) => page.getByRole('button', { name });
const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true });
const tileJson = 'https://tiles.openfreemap.org/planet';
const tinyTile = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=',
  'base64',
);

async function capture(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ path });
  await info.attach(name, { path, contentType: 'image/png' });
}

test.use({
  launchOptions: {
    args: [
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
      '--no-proxy-server',
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
    ],
  },
});

async function openSearch(page: Page, origin: string, count: number) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (url.pathname.includes('/seamark/') || url.searchParams.get('request') === 'GetMap')
      return route.fulfill({ contentType: 'image/png', body: tinyTile });
    return route.abort('blockedbyclient');
  });
  await page.route('https://tiles.openfreemap.org/fixture/**', (route) =>
    route.fulfill({ contentType: 'application/x-protobuf', body: Buffer.alloc(0) }),
  );
  await page.route(tileJson, (route) =>
    route.fulfill({
      json: { tiles: ['https://tiles.openfreemap.org/fixture/{z}/{x}/{y}.pbf'], maxzoom: 14 },
    }),
  );
  await page.route('**/v1/regions/discover', (route) => {
    const { center, radiusNm } = route.request().postDataJSON() as {
      center: Position;
      radiusNm: number;
    };
    const pack = createEmptyRegion(center, radiusNm, 'Mounted chart fixture');
    pack.sources = [
      {
        id: 'fixture-source',
        name: 'Intercepted chart test fixture',
        url: 'https://fixture.invalid/places',
        retrievedAt: pack.generatedAt,
        validUntil: pack.validUntil,
        attribution: 'Browser test',
        license: 'Test fixture',
        synthetic: false,
      },
    ];
    pack.places = Array.from({ length: count }, (_, index) => ({
      id: `fixture-${index + 1}`,
      name: `Fixture place ${index + 1}`,
      kind: index === count - 1 ? 'marina' : 'dock',
      position: [center[0] + (index + 1) * 0.001, center[1]],
      feeStatus: index === count - 1 ? 'free' : 'unknown',
      sourceIds: ['fixture-source'],
      overnightAllowed: null,
      availability: 'unknown',
      holding: 'unknown',
      facilities: [],
      notes: [],
    }));
    return route.fulfill({ json: { pack, providers: [], notices: [], partial: true } });
  });
  await page.goto('/');
  await button(page, /^Configure vessel$/).click();
  for (const [name, value] of Object.entries({
    'Vessel name': 'Chart Browser Test Vessel',
    'Length overall': '10',
    Beam: '3.2',
    'Loaded draft': '1.6',
    Displacement: '5000',
    'Usable rode length': '55',
    'Bow roller above water': '1',
  }))
    await field(page, name).fill(value);
  await page.getByRole('combobox', { name: 'Anchor design', exact: true }).click();
  await page.getByRole('option', { name: 'Modern scoop', exact: true }).click();
  await button(page, 'Save vessel & continue').click();
  await button(page, 'Configure defaults').click();
  await button(page, 'Save defaults').click();
  await button(page, 'Continue to app tour').click();
  await button(page, 'Skip tour').click();
  await button(page, 'Plan a stay').click();
  await button(page, 'Enter coordinates').click();
  await field(page, 'Latitude').fill(String(center[1]));
  await field(page, 'Longitude').fill(String(center[0]));
  await field(page, 'Search radius').fill('3');
  await button(page, 'Search this area').click();
  await expect(page.getByText(`${count} place records · 0 forecast intervals`)).toBeVisible();
  await button(page, /^Map view$/).click();
}

test.afterEach(async ({ page }) => {
  expect(await page.pageErrors()).toEqual([]);
});

test('source failure remains until a successful retry, then renderer failure has a list fallback', async ({
  page,
  baseURL,
}, info) => {
  await openSearch(page, baseURL!, 1);
  const canvas = page.locator('.maplibregl-canvas');
  await expect(canvas).toBeVisible();
  const marker = button(page, /^Select Fixture place 1\. Rank 1\. Needs more evidence\./);
  await expect(marker).toBeVisible();
  await expect(page.getByText('Loading map…', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Some map detail is unavailable', { exact: true })).toHaveCount(0);
  await button(page, /^Choose anchor position on map$/).click();
  const mapBox = (await canvas.boundingBox())!;
  await canvas.click({ position: { x: Math.round(mapBox.width * 0.15), y: 42 } });
  await button(page, /^Close dialog$/).click();
  const pin = button(page, /^Select Selected anchor position\. Manual pin\./);
  await expect(pin).toHaveAttribute('aria-pressed', 'true');
  await marker.click();
  await button(page, /^Close dialog$/).click();
  await expect(marker).toHaveAttribute('aria-pressed', 'true');

  const markerX = async () => (await marker.boundingBox())!.x - (await canvas.boundingBox())!.x;
  const xBeforePan = await markerX();
  await canvas.scrollIntoViewIfNeeded();
  const panBox = (await canvas.boundingBox())!;
  await page.mouse.move(panBox.x + panBox.width * 0.55, panBox.y + 30);
  await page.mouse.down();
  await page.mouse.move(panBox.x + panBox.width * 0.68, panBox.y + 30, { steps: 5 });
  await page.mouse.up();
  await expect.poll(markerX).toBeGreaterThan(xBeforePan + 25);

  // A genuine context loss produces renderer failure on the real canvas.
  await canvas.evaluate((node) => {
    const gl = (node as HTMLCanvasElement).getContext('webgl2')!;
    gl.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(page.getByText('Map renderer unavailable')).toBeVisible();
  let failTileJson = true;
  await page.route(tileJson, (route) =>
    failTileJson ? route.fulfill({ status: 503 }) : route.fallback(),
  );
  await button(page, /^Retry map$/).click();
  const warning = page.getByText('Some map detail is unavailable', { exact: true });
  await expect(warning).toBeVisible();
  await expect(marker).toHaveAttribute('aria-pressed', 'true');
  await expect(pin).toBeVisible();
  await expect.poll(markerX).toBeGreaterThan(xBeforePan + 25);
  await expect(canvas).toBeVisible();
  const canvasBox = (await canvas.boundingBox())!;
  const warningBox = (await warning.boundingBox())!;
  expect(warningBox.y).toBeGreaterThanOrEqual(canvasBox.y + canvasBox.height);
  await expect(page.locator('.maplibregl-ctrl-zoom-in')).toBeVisible();
  await warning.scrollIntoViewIfNeeded();
  await capture(page, info, 'source-failure-390x844');

  failTileJson = false;
  await button(page, /^Retry map$/).click();
  await expect(warning).toHaveCount(0);
  await expect(marker).toHaveAttribute('aria-pressed', 'true');
  await expect(pin).toBeVisible();
  await expect.poll(markerX).toBeGreaterThan(xBeforePan + 25);
  await capture(page, info, 'source-recovered-390x844');

  await canvas.evaluate((node) => {
    (node as HTMLCanvasElement)
      .getContext('webgl2')!
      .getExtension('WEBGL_lose_context')!
      .loseContext();
  });
  await expect(page.getByText('Map renderer unavailable')).toBeVisible();
  await button(page, /^Show list$/).click();
  await expect(button(page, /^Fixture place 1\. Rank 1\./)).toBeVisible();
  await expect(canvas).toHaveCount(0);

  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Offline planning', exact: true }).click();
  await page.getByRole('tab', { name: 'Explore', exact: true }).click();
  await button(page, /^Map view$/).click();
  await expect(page.getByText('No downloaded basemap confirmed')).toBeVisible();
});

test('list rank and selection agree with map markers beyond the limit and after sorting and filtering', async ({
  page,
  baseURL,
}, info) => {
  await openSearch(page, baseURL!, 52);
  const markers = button(page, /^Select Fixture place \d+\. Rank /);
  await expect(markers).toHaveCount(50);
  await expect(page.getByText('Ranks 1–50', { exact: true })).toBeVisible();
  await button(page, /^List view$/).click();
  await button(page, /^Fixture place 52\. Rank 52\./).click();
  await button(page, /^Close dialog$/).click();
  await button(page, /^Map view$/).click();
  await expect(markers).toHaveCount(51);
  const selected = button(page, /^Select Fixture place 52\. Rank 52\. Needs more evidence\./);
  await expect(selected).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Ranks 1–50 + selected rank 52', { exact: true })).toBeVisible();
  await selected.scrollIntoViewIfNeeded();
  await capture(page, info, 'selected-rank-52-390x844');

  await button(page, /Advanced filters & sorting/).click();
  await page.getByRole('combobox', { name: 'Sort by', exact: true }).click();
  await page.getByRole('option', { name: 'Estimated total price', exact: true }).click();
  await button(page, /^Apply$/).click();
  const reRanked = /^Fixture place 52\. Rank 1\. Needs more evidence\./;
  await expect(button(page, new RegExp('^Select ' + reRanked.source.slice(1)))).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await button(page, /^List view$/).click();
  await expect(button(page, reRanked)).toBeVisible();
  await button(page, /^Map view$/).click();
  await button(page, /^Docks$/).click();
  await expect(button(page, /^Select Fixture place 52\./)).toHaveCount(0);
  await expect(page.locator('.maplibregl-marker[aria-pressed="true"]')).toHaveCount(0);

  await button(page, /^Choose anchor position on map$/).click();
  const canvas = page.locator('.maplibregl-canvas');
  const box = (await canvas.boundingBox())!;
  await canvas.click({
    position: { x: Math.round(box.width * 0.25), y: Math.round(box.height * 0.55) },
  });
  await button(page, /^Close dialog$/).click();
  await expect(button(page, /^Select Selected anchor position\. Manual pin\./)).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(button(page, /^Show 51 results in list$/)).toBeVisible();
  await expect(page.getByText('◆ Manual pin', { exact: true })).toBeVisible();
});
