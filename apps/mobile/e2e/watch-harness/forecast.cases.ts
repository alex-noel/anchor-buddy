import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-17T09:00:00Z') });
});

test.afterEach(async ({ page }) => {
  expect(await page.pageErrors()).toEqual([]);
});

test('detail uses its explicit stay, shows gaps and nulls, and retains the final warning', async ({
  page,
}, info) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?forecast');
    await page.getByRole('button', { name: /Stay & departure weather/ }).click();
    await expect(page.getByText('Forecast time zone · America/New_York')).toBeVisible();
    const stay = page.getByText('Requested stay', { exact: true }).locator('..');
    await expect(stay.getByText(/Nov 17, 5:00 AM EST – Nov 17, 7:00 AM EST/)).toBeVisible();
    await expect(stay.getByText('Current forecast intervals span this window.')).toBeVisible();
    await expect(stay.getByText(/Values missing.*current/)).toBeVisible();
    const contingency = page.getByText('Departure contingency', { exact: true }).locator('..');
    await expect(contingency.getByText(/Nov 17, 7:00 AM EST – Nov 17, 9:00 AM EST/)).toBeVisible();
    await expect(contingency.getByText('Gaps in current forecast intervals.')).toBeVisible();
    await page.getByRole('button', { name: 'Show all 27 forecast intervals', exact: true }).click();
    await expect(
      page.getByText('Controlled official warning after first 24 intervals'),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByText('Forecast time zone · America/New_York').scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath(`forecast-detail-${width}.png`) });
  }
});

test('no-stay preview shows range, all interval warnings and source dates while retrying', async ({
  page,
}, info) => {
  await page.goto('/?forecast&area&preview&loading');
  await expect(page.getByText('Available forecast range', { exact: true })).toBeVisible();
  await expect(page.getByText('Requested stay', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Departure contingency', { exact: true })).toHaveCount(0);
  await expect(
    page.getByText(
      'Forecast context for the area. Live forecasts describe the search centre only.',
    ),
  ).toBeVisible();
  await expect(page.getByText('Gaps between intervals.')).toBeVisible();
  await page.getByRole('button', { name: 'Show all 27 intervals', exact: true }).click();
  await expect(
    page.getByText('Controlled official warning after first 24 intervals'),
  ).toBeVisible();
  await expect(page.getByText('Forecast source dates', { exact: true })).toBeVisible();
  await expect(page.getByText(/Retrieved.*valid until/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Loading sources…', exact: true })).toBeDisabled();
  await expect(page.getByText('Controlled retry help')).toBeVisible();
  await page.getByText('Available forecast range', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath('forecast-preview-390.png') });
});
