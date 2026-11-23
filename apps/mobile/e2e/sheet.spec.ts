import { expect, test, type Locator, type Page } from '@playwright/test';

const button = (root: Page | Locator, name: string) =>
  root.getByRole('button', { name, exact: true });
const input = (root: Page | Locator, name: string) =>
  root.getByRole('textbox', { name, exact: true });

test.beforeEach(async ({ context, baseURL }) => {
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === baseURL ? route.continue() : route.abort(),
  );
});
test.afterEach(async ({ page }) => {
  expect(await page.pageErrors(), 'Unexpected uncaught browser errors').toEqual([]);
});

test('dirty close offers a focused choice and keeps the draft until discard', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const setup = page.getByRole('heading', { name: 'Set up Anchor Buddy' });
  const configure = button(page, 'Configure vessel');
  const sheet = page.getByRole('dialog', { name: 'Configure your vessel', exact: true });
  const name = input(sheet, 'Vessel name');
  await configure.click();
  await expect(sheet).toBeVisible();
  await expect(button(sheet, 'Close dialog')).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Explore', exact: true })).toHaveCount(0);

  const initial = await name.inputValue();
  await name.fill('Temporary name');
  await name.fill(initial);
  await page.keyboard.press('Escape');
  await expect(setup).toBeVisible();

  await configure.click();
  await name.fill('Unfinished vessel');
  await page.keyboard.press('Escape');
  const prompt = page.getByRole('dialog', { name: 'Discard changes?', exact: true });
  const keep = button(prompt, 'Keep editing');
  await expect(keep).toBeFocused();
  await expect(input(prompt, 'Vessel name')).toHaveCount(0);
  await keep.click();
  await expect(name).toBeFocused();
  await expect(name).toHaveValue('Unfinished vessel');
  await page.keyboard.press('Escape');
  await button(prompt, 'Discard').click();
  await expect(setup).toBeVisible();
  await configure.click();
  await expect(name).toHaveValue(initial);
});

test('the short sheet keeps Save visible, focuses the invalid input and retains a failed save', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 380 });
  await page.goto('/');
  await button(page, 'Configure vessel').click();
  const sheet = page.getByRole('dialog', { name: 'Configure your vessel', exact: true });
  const save = button(sheet, 'Save vessel & continue');
  const name = input(sheet, 'Vessel name');
  await name.fill('');
  await expect(save).toBeInViewport();
  await save.click();
  await expect(name).toBeFocused();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAccessibleDescription(/Vessel name is required/);
  await expect(sheet.getByText('Vessel name is required.', { exact: true })).toBeVisible();
  await expect(save).toBeInViewport();

  for (const [field, value] of Object.entries({
    'Vessel name': 'Browser test vessel',
    'Length overall': '10',
    Beam: '3.2',
    'Loaded draft': '1.6',
    Displacement: '5000',
    'Usable rode length': '55',
    'Bow roller above water': '1',
  })) {
    await input(sheet, field).fill(value);
  }
  await expect(name).not.toHaveAttribute('aria-invalid', 'true');
  await sheet.getByRole('combobox', { name: 'Anchor design', exact: true }).click();
  await sheet.getByRole('option', { name: 'Modern scoop', exact: true }).click();
  await expect(save).toBeInViewport();

  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'anchorai:v1:settings-v2') {
        (document.activeElement ?? document).dispatchEvent(
          new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }),
        );
        Storage.prototype.setItem = original;
        throw new Error('Test storage write rejected');
      }
      return original.call(this, key, value);
    };
  });
  await save.click();
  await expect(sheet.getByText(/Could not save on this device/)).toBeVisible();
  await expect(name).toHaveValue('Browser test vessel');
  await expect(input(sheet, 'Usable rode length')).toHaveValue('55');
  await expect(save).toBeInViewport();
  await save.click();
  await expect(button(page, 'Edit vessel')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await button(page, 'Configure defaults').click();
  await button(page, 'Save defaults').click();
  await button(page, 'Continue to app tour').click();
  await button(page, 'Skip tour').click();
  await page.getByRole('tab', { name: 'Settings', exact: true }).click();
  const opener = button(page, 'App tour');
  await opener.press('Enter');
  const tour = page.getByRole('dialog', { name: 'App tour', exact: true });
  await expect(button(tour, 'Close dialog')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(button(tour, 'Next')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(tour).toHaveCount(0);
  await expect(opener).toBeFocused();
});
