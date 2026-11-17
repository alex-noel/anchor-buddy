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
