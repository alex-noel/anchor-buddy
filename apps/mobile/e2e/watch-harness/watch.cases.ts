import { test, expect } from '@playwright/test';
test('cards and field errors remain readable on phone and desktop', async ({ page }, testInfo) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?cards');
    await expect(page.getByText('Unknown', { exact: true })).toBeVisible();
    await expect(page.getByText('Price unknown', { exact: true })).toBeVisible();
    await expect(page.getByText('Free', { exact: true })).toBeVisible();
    await expect(page.getByText('0.0 m', { exact: true }).first()).toBeVisible();
    for (const status of ['Checks pass', 'Excluded', 'Needs more evidence'])
      await expect(
        page.getByRole('button', { name: new RegExp('Long Harbour.*' + status) }),
      ).toBeVisible();
    await page.getByRole('button', { name: /Long Harbour.*Excluded/ }).click();
    await expect(page.getByText('Opened card: 1')).toBeVisible();
    const invalid = page.getByRole('textbox', { name: 'Validation fixture', exact: true });
    await expect(invalid).toHaveAttribute('aria-invalid', 'true');
    await expect(invalid).toHaveAccessibleDescription(
      'Enter a verified value. Enter a finite positive value.',
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath('cards-' + width + '.png'), fullPage: true });
  }
});
test('late position replies cannot replace manual edits or a cancelled/unmounted capture', async ({
  page,
}) => {
  await page.goto('/');
  const capture = page.getByRole('button', {
    name: 'Capture position at anchor drop',
    exact: true,
  });
  const lat = page.getByRole('textbox', { name: 'Anchor latitude', exact: true });
  const resolve = () =>
    page.evaluate(() =>
      (window as any).watchHarness.resolveFix({
        timestamp: Date.now(),
        coords: { latitude: 88, longitude: 12, accuracy: 5 },
      }),
    );
  await capture.click();
  await page.waitForFunction(() => (window as any).watchHarness.pendingFixes() === 1);
  await lat.fill('45');
  await resolve();
  await expect(lat).toHaveValue('45');
  await capture.click();
  await page.waitForFunction(() => (window as any).watchHarness.pendingFixes() === 1);
  await page.getByRole('button', { name: 'Cancel position capture', exact: true }).click();
  await resolve();
  await expect(lat).toHaveValue('45');
  await capture.click();
  await page.waitForFunction(() => (window as any).watchHarness.pendingFixes() === 1);
  await page.getByRole('button', { name: 'Toggle component' }).click();
  await resolve();
  await page.getByRole('button', { name: 'Toggle component' }).click();
  await expect(lat).toHaveValue('');
});
test('active native status cancels pending acquisition without changing its anchor', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Capture position at anchor drop', exact: true }).click();
  await page.waitForFunction(() => (window as any).watchHarness.pendingFixes() === 1);
  await page.evaluate(() =>
    (window as any).watchHarness.emit({
      state: 'monitoring',
      serviceRunning: true,
      sessionId: 'external-session',
      anchor: { latitude: 50, longitude: 10 },
      radiusM: 50,
    }),
  );
  await page.evaluate(() =>
    (window as any).watchHarness.resolveFix({
      timestamp: Date.now(),
      coords: { latitude: 88, longitude: 12, accuracy: 5 },
    }),
  );
  await expect(page.getByText(/50.000000, 10.000000/)).toBeVisible();
  expect(await page.evaluate(() => (window as any).watchHarness.calls.arm)).toBe(0);
});
test('fresh audible confirmation expires against monotonic elapsed time', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Anchor latitude', exact: true }).fill('45');
  await page.getByRole('textbox', { name: 'Anchor longitude', exact: true }).fill('12');
  await page.getByRole('textbox', { name: 'Alarm radius', exact: true }).fill('50');
  await page
    .getByRole('checkbox', {
      name: 'I verified the actual anchor position and alarm radius.',
      exact: true,
    })
    .check();
  await page.getByRole('checkbox', { name: /I set and tested the anchor/ }).check();
  await page.getByRole('button', { name: 'Allow location and alerts', exact: true }).click();
  await page.getByRole('button', { name: 'Test alarm', exact: true }).click();
  await page.getByRole('checkbox', { name: /I heard the test alarm/ }).check();
  const arm = page.getByRole('button', { name: 'Arm anchor watch', exact: true });
  await expect(arm).toBeEnabled();
  await page.clock.setSystemTime(Date.now() - 86400000);
  await expect(arm).toBeEnabled();
  await page.clock.fastForward(600001);
  await expect(arm).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: /I heard the test alarm/ })).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).watchHarness.calls.arm)).toBe(0);
});

test('watch capture accepts a valid polar fix through an inactive permission prompt', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Capture position at anchor drop', exact: true }).click();
  await page.waitForFunction(() => (window as any).watchHarness.pendingFixes() === 1);
  await page.evaluate(() => {
    (window as any).setWatchAppState('inactive');
    (window as any).setWatchAppState('active');
    (window as any).watchHarness.resolveFix({
      timestamp: Date.now(),
      coords: { latitude: 88, longitude: 12, accuracy: 5 },
    });
  });
  await expect(page.getByRole('textbox', { name: 'Anchor latitude', exact: true })).toHaveValue(
    '88',
  );
  await expect(page.getByRole('textbox', { name: 'Anchor longitude', exact: true })).toHaveValue(
    '12',
  );
  expect(await page.evaluate(() => (window as any).watchHarness.calls.arm)).toBe(0);
});

test('backgrounding invalidates delayed permission and alarm readiness', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => (window as any).watchHarness.holdPermissions());
  await page.getByRole('button', { name: 'Allow location and alerts', exact: true }).click();
  await page.evaluate(() => {
    (window as any).setWatchAppState('background');
    (window as any).setWatchAppState('active');
    (window as any).watchHarness.resolvePermissions();
  });
  await expect(page.getByRole('button', { name: 'Test alarm', exact: true })).toBeDisabled();
  await expect(
    page.getByText(
      'The app changed state while checking permissions. Recheck location and alerts before arming.',
    ),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Allow location and alerts', exact: true }).click();
  await page.evaluate(() => (window as any).watchHarness.holdAlarm());
  await page.getByRole('button', { name: 'Test alarm', exact: true }).click();
  await page.evaluate(() => {
    (window as any).setWatchAppState('background');
    (window as any).setWatchAppState('active');
    (window as any).watchHarness.resolveAlarm();
  });
  await expect(page.getByRole('checkbox', { name: /I heard the test alarm/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Arm anchor watch', exact: true })).toBeDisabled();
});

test('details preserve visible blocking reasons and separate source dates', async ({ page }, testInfo) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?details');
    await expect(page.getByText('Synthetic exclusion remains visible before planning.')).toBeVisible();
    await expect(page.getByText('Synthetic depth evidence is missing.')).toBeVisible();
    await expect(page.getByText(/Historical assessment/)).toBeVisible();
    await expect(page.getByText('Synthetic test data pack', { exact: true })).toBeVisible();
    await expect(page.getByText(/Local evidence cache saved/)).toBeVisible();
    await page.getByRole('button', { name: /Other assessment findings/ }).click();
    await expect(page.getByText('Secondary synthetic context.')).toBeVisible();
    await page.getByRole('button', { name: /Sources & freshness/ }).click();
    await expect(page.getByText(/Retrieved/).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('details-' + width + '.png'), fullPage: true });
  }
});
