import { expect, test } from '@playwright/test';

const button = (page: import('@playwright/test').Page, name: string | RegExp) =>
  page.getByRole('button', { name, exact: typeof name === 'string' });
const field = (page: import('@playwright/test').Page, name: string) =>
  page.getByRole('textbox', { name, exact: true });

test('Settings keeps connection and catalogue results beside the action and supports retry', async ({
  context,
  page,
  baseURL,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.origin === new URL(baseURL!).origin ? route.continue() : route.abort();
  });
  await page.goto('/');
  await button(page, 'Configure vessel').click();
  for (const [name, value] of Object.entries({
    'Vessel name': 'Settings test vessel',
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
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();

  const disclosure = button(page, 'Data connection');
  await disclosure.press('Enter');
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  await field(page, 'Regional API address').fill('https://anchor-api.test');
  let attempts = 0;
  await page.route('https://anchor-api.test/v1/regions', async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await route.fulfill({ status: 503, json: { message: 'Controlled unavailable response' } });
      return;
    }
    await route.fulfill({ json: { regions: [] } });
  });

  await button(page, 'Connect & check regions').click();
  const failure = page.getByRole('alert');
  await expect(failure).toContainText(
    'Could not reach the regional API at https://anchor-api.test',
  );
  await expect(failure).toContainText('reachable from this device');
  await expect(failure).toBeVisible();
  await testInfo.attach('settings-endpoint-failure-390x844', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });

  await button(page, 'Connect & check regions').click();
  await expect(page.getByRole('status').filter({ hasText: 'Regional API reached' })).toBeVisible();
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Catalogue loaded with no reviewed regional packs' }),
  ).toBeVisible();
  await expect(
    page.getByText(/No reviewed regional packs are published on this server yet/),
  ).toBeVisible();
  await expect(button(page, 'Data connection')).toHaveAttribute('aria-expanded', 'true');
  await testInfo.attach('settings-connection-retry-success-390x844', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
  expect(attempts).toBe(2);
  expect(await page.pageErrors()).toEqual([]);
});
