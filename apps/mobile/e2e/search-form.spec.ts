import { expect, test, type Locator, type Page } from '@playwright/test';
import type { Position } from '@anchor-buddy/domain';
import { createEmptyRegion } from '../src/lib/regionalDataCore';

const button = (scope: Page | Locator, name: string) =>
  scope.getByRole('button', { name, exact: true });
const textbox = (scope: Page | Locator, name: string) =>
  scope.getByRole('textbox', { name, exact: true });

async function configureVessel(page: Page) {
  await page.goto('/');
  await button(page, 'Configure vessel').click();
  for (const [name, value] of Object.entries({
    'Vessel name': 'Browser Test Vessel',
    'Length overall': '10',
    Beam: '3.2',
    'Loaded draft': '1.6',
    Displacement: '5000',
    'Usable rode length': '55',
    'Bow roller above water': '1',
  })) {
    await textbox(page, name).fill(value);
  }
  await page.getByRole('combobox', { name: 'Anchor design', exact: true }).click();
  await page.getByRole('option', { name: 'Modern scoop', exact: true }).click();
  await button(page, 'Save vessel & continue').click();
  await button(page, 'Configure defaults').click();
}

async function finishSetup(page: Page) {
  await button(page, 'Save defaults').click();
  await button(page, 'Continue to app tour').click();
  await button(page, 'Skip tour').click();
}

test.beforeEach(async ({ context, page, baseURL }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === baseURL ? route.continue() : route.abort(),
  );
});
test.afterEach(async ({ page }) => {
  expect(await page.pageErrors()).toEqual([]);
});

test('search defaults and edits keep collapsed limits and multiple seabeds', async ({ page }) => {
  await configureVessel(page);
  const defaults = page.getByRole('dialog', { name: 'Search defaults', exact: true });
  await expect(textbox(defaults, 'Default stay duration')).toBeVisible();
  await expect(textbox(defaults, 'Latitude')).toHaveCount(0);
  const depth = button(defaults, 'Depth & seabed');
  await expect(depth).toHaveAttribute('aria-expanded', 'false');
  await depth.click();
  await textbox(defaults, 'Preferred maximum depth').fill('8');
  const beds = (scope: Locator, name: string) => scope.getByRole('checkbox', { name, exact: true });
  await beds(defaults, 'Sand').check();
  await beds(defaults, 'Mud').check();
  await depth.click();
  await expect(depth).toHaveAccessibleDescription(/8 m.*Sand.*Mud/);

  const limits = button(defaults, 'Operating limits');
  await limits.click();
  const wind = textbox(defaults, 'Sustained wind');
  await wind.fill('-1');
  await limits.click();
  await button(defaults, 'Save defaults').click();
  await expect(limits).toHaveAttribute('aria-expanded', 'true');
  await expect(wind).toBeFocused();
  await expect(wind).toHaveAttribute('aria-invalid', 'true');
  await wind.fill('18');
  await limits.click();
  await expect(limits).toHaveAccessibleDescription(/18 kt/);
  await finishSetup(page);

  const submitted: Position[] = [];
  await page.route('**/v1/regions/discover', async (route) => {
    const { center, radiusNm } = route.request().postDataJSON() as {
      center: Position;
      radiusNm: number;
    };
    submitted.push(center);
    await route.fulfill({
      json: {
        pack: createEmptyRegion(center, radiusNm),
        providers: [],
        partial: true,
        notices: [],
      },
    });
  });
  await button(page, 'Plan a stay').click();
  const search = page.getByRole('dialog', { name: 'Plan the stay', exact: true });
  await expect(textbox(search, 'Default stay duration')).toHaveCount(0);
  await expect(button(search, 'Operating limits')).toHaveAccessibleDescription(/18 kt/);
  const searchDepth = button(search, 'Depth & seabed');
  await expect(searchDepth).toHaveAccessibleDescription(/8 m.*Sand.*Mud/);
  await button(search, 'Enter coordinates').click();
  await textbox(search, 'Latitude').fill('54.35');
  await textbox(search, 'Longitude').fill('18.65');
  const radius = textbox(search, 'Search radius');
  await radius.fill('0');
  await button(search, 'Search this area').click();
  await expect(radius).toBeFocused();
  await expect(radius).toHaveAttribute('aria-invalid', 'true');
  expect(submitted).toHaveLength(0);
  await radius.fill('3');
  await button(search, 'Search this area').click();
  await expect.poll(() => submitted).toEqual([[18.65, 54.35]]);

  await button(page, 'Edit').click();
  await expect(button(search, 'Coordinates · 54.3500, 18.6500')).toBeVisible();
  await searchDepth.click();
  await expect(beds(search, 'Mud')).toBeChecked();
  await beds(search, 'Mud').uncheck();
  await button(search, 'Close dialog').click();
  await button(
    page.getByRole('dialog', { name: 'Discard changes?', exact: true }),
    'Discard',
  ).click();
  await button(page, 'Edit').click();
  await expect(searchDepth).toHaveAccessibleDescription(/8 m.*Sand.*Mud/);
});

test('location lookup only submits explicitly and discards late replies', async ({
  context,
  page,
}) => {
  await configureVessel(page);
  await finishSetup(page);
  const queries: string[] = [];
  const longName =
    'Northern Harbour and Coastal Nature Reserve near the Outer Marina and River Mouth';
  const held: (() => void)[] = [];
  await page.route('**/v1/geocode?*', async (route) => {
    const query = new URL(route.request().url()).searchParams.get('q')!;
    queries.push(query);
    if (query === 'Old query' || query === 'Cancelled query') {
      await new Promise<void>((resolve) => held.push(resolve));
      await route.fulfill({
        json: { results: [{ name: 'Late obsolete match', position: [12, 45] }] },
      });
    } else if (query === 'Provider error') {
      await route.fulfill({ status: 503, json: { message: 'Place provider unavailable.' } });
    } else {
      await route.fulfill({
        json: {
          results: query === 'Harbour' ? [{ name: longName, position: [18.65, 54.35] }] : [],
        },
      });
    }
  });
  const matchesQuery = (url: string, query: string) => {
    const target = new URL(url);
    return target.pathname === '/v1/geocode' && target.searchParams.get('q') === query;
  };

  try {
    await button(page, 'Plan a stay').click();
    const search = page.getByRole('dialog', { name: 'Plan the stay', exact: true });
    const input = textbox(search, 'Town, harbour or address');
    await input.fill('Old query');
    expect(queries).toEqual([]);
    await input.press('Enter');
    await expect.poll(() => held.length).toBe(1);
    const outdated = page.waitForEvent('requestfailed', (request) =>
      matchesQuery(request.url(), 'Old query'),
    );
    await input.fill('Harbour');
    expect((await outdated).failure()?.errorText).toMatch(/ABORTED/i);
    held.shift()?.();
    expect(queries).toEqual(['Old query']);
    await button(search, 'Find location').click();
    const match = button(search, 'Use ' + longName);
    await expect(match).toBeVisible();
    expect((await match.boundingBox())!.height).toBeGreaterThan(44);
    await match.click();
    const selected = search.getByText('Selected area · ' + longName, { exact: true });
    await expect(selected).toBeVisible();

    await input.fill('Cancelled query');
    await input.press('Enter');
    await expect.poll(() => held.length).toBe(1);
    const cancelled = page.waitForEvent('requestfailed', (request) =>
      matchesQuery(request.url(), 'Cancelled query'),
    );
    await button(search, 'Cancel lookup').click();
    expect((await cancelled).failure()?.errorText).toMatch(/ABORTED/i);
    held.shift()?.();
    await expect(search.getByText('Location lookup cancelled.')).toBeVisible();
    await expect(button(search, 'Use Late obsolete match')).toHaveCount(0);
    await expect(selected).toBeVisible();

    await input.fill('Empty query');
    await input.press('Enter');
    await expect(search.getByText(/No locations found/)).toBeVisible();
    await input.fill('Provider error');
    await input.press('Enter');
    await expect(
      search.getByText(/Location lookup failed.*Place provider unavailable/),
    ).toBeVisible();
    await context.setOffline(true);
    await input.fill('Offline query');
    await input.press('Enter');
    await expect(button(search, 'Find location')).toBeDisabled();
    await expect(search.getByText(/Location lookup needs a connection/)).toBeVisible();
    expect(queries).toEqual([
      'Old query',
      'Harbour',
      'Cancelled query',
      'Empty query',
      'Provider error',
    ]);
    await expect(selected).toBeVisible();

    await context.setOffline(false);
    await expect(button(search, 'Find location')).toBeEnabled();
    await page.route('**/v1/regions/discover', (route) => {
      return route.fulfill({
        json: {
          pack: createEmptyRegion([18.65, 54.35], 3, longName),
          providers: [],
          partial: true,
          notices: [],
        },
      });
    });
    const completed = page.waitForRequest(
      (request) => new URL(request.url()).pathname === '/v1/regions/discover',
      { timeout: 10_000 },
    );
    await button(search, 'Search this area').click();
    const payload = (await completed).postDataJSON();
    expect(payload).toMatchObject({ name: longName, center: [18.65, 54.35] });
    expect(payload).not.toHaveProperty('timezone');
    await button(page, 'Edit').click();
    await expect(selected).toBeVisible();
  } finally {
    for (const release of held) release();
  }
});
