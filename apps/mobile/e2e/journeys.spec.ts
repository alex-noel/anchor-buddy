import { expect, test as base, type Page, type Route } from '@playwright/test';
import type { Position } from '@anchor-buddy/domain';
import { createEmptyRegion } from '../src/lib/regionalDataCore';

const discoveryPath = '/v1/regions/discover';
const center: Position = [18.65, 54.35];
const vesselName = 'Browser Test Vessel';

const test = base.extend<{ guardedPage: Page }>({
  guardedPage: async ({ context, page, baseURL }, use, testInfo) => {
    const origin = new URL(baseURL!).origin;
    const errors: string[] = [];
    context.on('weberror', (event) => errors.push(event.error().stack ?? event.error().message));
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      return url.origin === origin && !url.pathname.startsWith('/v1/')
        ? route.continue()
        : route.abort('blockedbyclient');
    });
    await use(page);
    if (errors.length) {
      await testInfo.attach('page-errors', {
        body: errors.join('\n\n'),
        contentType: 'text/plain',
      });
    }
    if (errors.length || testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('controls', {
        body: await page.locator('body').ariaSnapshot({ timeout: 2_000 }).catch(String),
        contentType: 'text/plain',
      });
    }
    expect(errors, 'Unexpected uncaught browser errors').toEqual([]);
  },
});

function controlName(name: string) {
  // React Native Web can include a decorative Feather glyph in the accessible name.
  const label = name.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
  return new RegExp('^(?:[\\uE000-\\uF8FF]+\\s*)?' + label + '$');
}

const button = (page: Page, name: string | RegExp) =>
  page.getByRole('button', { name: typeof name === 'string' ? controlName(name) : name });
const heading = (page: Page, name: string) => page.getByRole('heading', { name, exact: true });
const field = (page: Page, name: string) => page.getByRole('textbox', { name, exact: true });

async function completeSetup(page: Page) {
  await page.goto('/');
  await expect(heading(page, 'Set up Anchor Buddy')).toBeVisible();
  await expect(button(page, 'Continue to app tour')).toBeDisabled();
  await button(page, 'Configure vessel').click();
  for (const [name, value] of Object.entries({
    'Vessel name': vesselName,
    'Length overall': '10',
    Beam: '3.2',
    'Loaded draft': '1.6',
    Displacement: '5000',
    'Usable rode length': '55',
    'Bow roller above water': '1',
  })) {
    await field(page, name).fill(value);
  }
  await page.getByRole('combobox', { name: 'Anchor design', exact: true }).click();
  await page.getByRole('option', { name: 'Modern scoop', exact: true }).click();
  await button(page, 'Save vessel & continue').click();
  await button(page, 'Configure defaults').click();
  await button(page, 'Save defaults').click();
  await button(page, 'Continue to app tour').click();
  await expect(heading(page, 'App tour')).toBeVisible();
  await button(page, 'Skip tour').click();
  await expect(page.getByText('No active search', { exact: true })).toBeVisible();
}

async function enterSearchArea(page: Page) {
  await button(page, 'Enter coordinates').click();
  await field(page, 'Latitude').fill(String(center[1]));
  await field(page, 'Longitude').fill(String(center[0]));
}

async function emptyDiscovery(route: Route) {
  const request = route.request().postDataJSON() as { center: Position; radiusNm: number };
  const pack = createEmptyRegion(request.center, request.radiusNm, 'Browser test area');
  await route.fulfill({
    json: {
      pack,
      providers: [],
      notices: ['Test response with no source evidence.'],
      partial: true,
    },
  });
}

test('fresh setup opens empty Explore and keeps native watch unavailable', async ({
  guardedPage: page,
}) => {
  await completeSetup(page);
  await expect(heading(page, 'Explore')).toBeVisible();
  await expect(button(page, 'Plan a stay')).toBeVisible();
  await expect(button(page, 'Save results')).toHaveCount(0);
  await expect(button(page, 'Close search')).toHaveCount(0);

  await page.reload();
  await expect(heading(page, 'Explore')).toBeVisible();
  await expect(heading(page, 'Set up Anchor Buddy')).toHaveCount(0);
  await button(page, 'Anchor watch').click();
  await expect(heading(page, 'Native watch unavailable')).toBeVisible();
  await expect(page.getByText(/No anchor watch is running here/)).toBeVisible();
  await expect(button(page, /^(?:[\uE000-\uF8FF]+\s*)?(Arm|Start|Stop|Test alarm)/i)).toHaveCount(
    0,
  );
  await button(page, 'Back to Explore').click();
  await expect(page.getByText('No active search', { exact: true })).toBeVisible();
});

test('search drafts and requests can be cancelled, then a saved search reopens and reassesses', async ({
  guardedPage: page,
}) => {
  let requests = 0;
  let finishPending: () => void = () => {};
  const pending = new Promise<void>((resolve) => {
    finishPending = resolve;
  });
  await page.route(discoveryPath, async (route) => {
    requests += 1;
    if (requests === 1) {
      await pending;
      await route.fulfill({
        status: 503,
        json: { message: 'Cancelled request unexpectedly surfaced.' },
      });
    } else {
      await emptyDiscovery(route);
    }
  });

  try {
    await completeSetup(page);
    await button(page, 'Plan a stay').click();
    await button(page, 'Search this area').click();
    await expect(page.getByText(/Choose a coastal region, find a location/)).toBeVisible();
    await enterSearchArea(page);
    await button(page, 'Close dialog').click();
    await expect(page.getByText('No active search', { exact: true })).toBeVisible();
    expect(requests).toBe(0);

    await button(page, 'Plan a stay').click();
    await enterSearchArea(page);
    const submitted = page.waitForRequest(
      (request) => new URL(request.url()).pathname === discoveryPath,
    );
    await button(page, 'Search this area').click();
    expect((await submitted).postDataJSON()).toMatchObject({ center });
    await expect(button(page, 'Loading live sources…')).toBeVisible();
    const aborted = page.waitForEvent(
      'requestfailed',
      (request) => new URL(request.url()).pathname === discoveryPath,
    );
    await button(page, 'Cancel').click();
    await expect(page.getByText(/Loading cancelled/)).toBeVisible();
    expect((await aborted).failure()?.errorText).toMatch(/ABORTED/i);
    finishPending();
    await button(page, 'Close search').click();
    await expect(page.getByText('No active search', { exact: true })).toBeVisible();

    await button(page, 'Plan a stay').click();
    await enterSearchArea(page);
    await button(page, 'Search this area').click();
    await expect(page.getByText(/0 place records · 0 forecast intervals/)).toBeVisible();
    await expect(page.getByText('No matching results', { exact: true })).toBeVisible();
    await expect(page.getByText(/Cancelled request unexpectedly surfaced/)).toHaveCount(0);

    await button(page, 'Save results').click();
    const saveDialog = page.getByRole('dialog');
    await expect(heading(page, 'Save search results')).toBeVisible();
    await field(page, 'Search name').fill('Browser journey search');
    await saveDialog.getByRole('button', { name: controlName('Save results') }).click();
    await expect(page.getByText(/Results saved\. Open them from Saved/)).toBeVisible();
    await button(page, 'Close search').click();
    await expect(page.getByText('No active search', { exact: true })).toBeVisible();

    await page.reload();
    await page.getByRole('tab', { name: controlName('Saved') }).click();
    await expect(page.getByText('Browser journey search', { exact: true })).toBeVisible();
    await button(page, 'View saved snapshot').click();
    await expect(page.getByText(/These are historical results/)).toBeVisible();
    await button(page, 'Open & reassess').click();
    await expect(heading(page, 'Explore')).toBeVisible();
    await expect(page.getByText(/Reassessed with Browser Test Vessel/)).toBeVisible();
    await expect(page.getByText(/0 place records · 0 forecast intervals/)).toBeVisible();
    expect(requests).toBe(3);
    await expect(button(page, 'Close search')).toBeVisible();
  } finally {
    finishPending();
  }
});
