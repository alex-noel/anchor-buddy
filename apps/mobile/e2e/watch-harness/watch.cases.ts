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

test('details preserve visible blocking reasons and separate source dates', async ({
  page,
}, testInfo) => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/?details');
    await expect(
      page.getByText('Synthetic exclusion remains visible before planning.'),
    ).toBeVisible();
    await expect(page.getByText('Synthetic depth evidence is missing.')).toBeVisible();
    await expect(page.getByText(/Historical assessment/)).toBeVisible();
    await expect(page.getByText('Synthetic test data pack', { exact: true })).toBeVisible();
    await expect(page.getByText(/Local evidence cache saved/)).toBeVisible();
    await page.getByRole('button', { name: /Other assessment findings/ }).click();
    await expect(page.getByText('Secondary synthetic context.')).toBeVisible();
    await page.getByRole('button', { name: /Sources & freshness/ }).click();
    await expect(page.getByText(/Retrieved/).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: testInfo.outputPath('details-' + width + '.png'),
      fullPage: true,
    });
  }
});

test('stop confirmation cancels without side effects and waits for native completion', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() =>
    (window as any).watchHarness.emit({
      state: 'monitoring',
      serviceRunning: true,
      sessionId: 'confirmed-session',
      anchor: { latitude: 45, longitude: 12 },
      radiusM: 50,
    }),
  );
  const stop = page.getByRole('button', { name: 'Stop watch', exact: true });
  await stop.click();
  await expect(page.getByText(/Stop monitoring session confirmed-session/)).toBeVisible();
  await page.getByRole('button', { name: 'Keep monitoring', exact: true }).click();
  expect(await page.evaluate(() => (window as any).watchHarness.calls.stop)).toBe(0);
  await stop.click();
  await page.evaluate(() => (window as any).watchHarness.holdStop());
  await page.getByRole('button', { name: 'Confirm stop watch', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Verifying stop…', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => (window as any).watchHarness.calls.stop)).toBe(1);
  await page.evaluate(() => (window as any).watchHarness.resolveStop());
  await expect(page.getByRole('dialog', { name: 'Stop anchor watch?', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText('Watch not armed', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as any).watchHarness.calls.stop)).toBe(1);
});

test('stop failure retains retry and a changed session requires a new confirmation', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() =>
    (window as any).watchHarness.emit({
      state: 'monitoring',
      serviceRunning: true,
      sessionId: 'first-session',
      anchor: { latitude: 45, longitude: 12 },
      radiusM: 50,
    }),
  );
  await page.getByRole('button', { name: 'Stop watch', exact: true }).click();
  await page.evaluate(() => (window as any).watchHarness.emit({ sessionId: 'second-session' }));
  await page.getByRole('button', { name: 'Confirm stop watch', exact: true }).click();
  await expect(page.getByText(/The watch session changed/)).toBeVisible();
  expect(await page.evaluate(() => (window as any).watchHarness.calls.stop)).toBe(0);
  await page.getByRole('button', { name: 'Keep monitoring', exact: true }).click();
  await page.getByRole('button', { name: 'Stop watch', exact: true }).click();
  await page.evaluate(() => (window as any).watchHarness.failStop(true));
  await page.getByRole('button', { name: 'Confirm stop watch', exact: true }).click();
  await expect(
    page.getByText(/Could not confirm that monitoring stopped.*Controlled native stop failure/),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).watchHarness.calls.stop)).toBe(1);
  await page.evaluate(() => (window as any).watchHarness.failStop(false));
  await page.getByRole('button', { name: 'Confirm stop watch', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Stop anchor watch?', exact: true })).toHaveCount(
    0,
  );
  expect(await page.evaluate(() => (window as any).watchHarness.calls.stop)).toBe(2);
});

test('an active watch without a session identifier never receives a stop command', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() =>
    (window as any).watchHarness.emit({
      state: 'monitoring',
      serviceRunning: true,
      sessionId: undefined,
      anchor: { latitude: 45, longitude: 12 },
      radiusM: 50,
    }),
  );
  await page.getByRole('button', { name: 'Stop watch', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm stop watch', exact: true }).click();
  await expect(page.getByText(/no verified identifier/)).toBeVisible();
  expect(await page.evaluate(() => (window as any).watchHarness.calls.stop)).toBe(0);
  await expect(page.getByRole('dialog', { name: 'Stop anchor watch?' })).toBeVisible();
});

test('unavailable post-stop status cannot confirm a stop', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    (window as any).watchHarness.emit({
      state: 'monitoring',
      serviceRunning: true,
      sessionId: 'postcheck',
      anchor: { latitude: 45, longitude: 12 },
      radiusM: 50,
    });
    (window as any).watchHarness.overridePostStopRead({
      nativeAvailable: false,
      state: 'idle',
      serviceRunning: false,
    });
  });
  await page.getByRole('button', { name: 'Stop watch', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm stop watch', exact: true }).click();
  await expect(page.getByText(/native watch service is unavailable/)).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Stop anchor watch?' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).watchHarness.calls.stop)).toBe(1);
});

test('new active session event during delayed stop is not overwritten by stale idle', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    (window as any).watchHarness.emit({
      state: 'monitoring',
      serviceRunning: true,
      sessionId: 'session-a',
      anchor: { latitude: 45, longitude: 12 },
      radiusM: 50,
    });
    (window as any).watchHarness.holdStop();
  });
  await page.getByRole('button', { name: 'Stop watch', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm stop watch', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Verifying stop…', exact: true })).toBeDisabled();
  await page.evaluate(() => {
    (window as any).watchHarness.emit({
      state: 'monitoring',
      serviceRunning: true,
      sessionId: 'session-b',
    });
    (window as any).watchHarness.resolveStop();
  });
  await expect(
    page.getByText(/newer or inconsistent watch status arrived during the stop/),
  ).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Stop anchor watch?' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).watchHarness.calls.stop)).toBe(1);
});

test('an idle post-read naming a different session cannot confirm the old session stopped', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    (window as any).watchHarness.emit({
      state: 'monitoring',
      serviceRunning: true,
      sessionId: 'old-session',
      anchor: { latitude: 45, longitude: 12 },
      radiusM: 50,
    });
    (window as any).watchHarness.overridePostStopRead({
      nativeAvailable: true,
      state: 'idle',
      serviceRunning: false,
      sessionId: 'other-session',
    });
  });
  await page.getByRole('button', { name: 'Stop watch', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm stop watch', exact: true }).click();
  await expect(page.getByText(/watch session changed/i)).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Stop anchor watch?' })).toBeVisible();
  expect(await page.evaluate(() => (window as any).watchHarness.calls.stop)).toBe(1);
});

test('post-stop empty session ID is rejected while an absent ID can confirm idle', async ({
  page,
}) => {
  for (const sessionId of ['', undefined]) {
    await page.goto('/');
    await page.evaluate((value) => {
      (window as any).watchHarness.emit({
        state: 'monitoring',
        serviceRunning: true,
        sessionId: 'old-session',
        anchor: { latitude: 45, longitude: 12 },
        radiusM: 50,
      });
      (window as any).watchHarness.overridePostStopRead({
        nativeAvailable: true,
        state: 'idle',
        serviceRunning: false,
        sessionId: value,
      });
    }, sessionId);
    await page.getByRole('button', { name: 'Stop watch', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm stop watch', exact: true }).click();
    if (sessionId === '') await expect(page.getByText(/watch session changed/i)).toBeVisible();
    else await expect(page.getByRole('dialog', { name: 'Stop anchor watch?' })).toHaveCount(0);
  }
});
