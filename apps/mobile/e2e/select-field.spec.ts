import { expect, test } from '@playwright/test';

test('select keyboard navigation commits on confirmation and cancels without closing the sheet', async ({
  context,
  page,
  baseURL,
}) => {
  const errors: string[] = [];
  context.on('weberror', (event) => errors.push(event.error().message));
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === baseURL ? route.continue() : route.abort(),
  );

  await page.goto('/');
  await page.getByRole('button', { name: 'Configure vessel', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const select = dialog.getByRole('combobox', { name: 'Vessel type', exact: true });
  const list = dialog.getByRole('listbox', { name: 'Vessel type options', exact: true });
  const sailboat = list.getByRole('option', { name: 'Sailboat', exact: true });
  const catamaran = list.getByRole('option', { name: 'Catamaran', exact: true });
  const trimaran = list.getByRole('option', { name: 'Trimaran', exact: true });

  await dialog.getByRole('textbox', { name: 'Vessel name', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(select).toBeFocused();
  await page.keyboard.press('Space');
  await expect(select).toHaveAttribute('aria-expanded', 'true');
  await expect(sailboat).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(select).toHaveAttribute(
    'aria-activedescendant',
    (await trimaran.getAttribute('id'))!,
  );
  await expect(sailboat).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Escape');
  await expect(list).toHaveCount(0);
  await expect(dialog.getByRole('heading', { name: 'Configure your vessel' })).toBeVisible();
  await expect(select).toBeFocused();
  await expect(select.getByText('Sailboat', { exact: true })).toBeVisible();

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('c');
  await expect(select).toHaveAttribute(
    'aria-activedescendant',
    (await catamaran.getAttribute('id'))!,
  );
  await page.keyboard.press('Enter');
  await expect(select).toHaveAttribute('aria-expanded', 'false');
  await expect(select).toBeFocused();
  await expect(select.getByText('Catamaran', { exact: true })).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(catamaran).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Tab');
  await expect(list).toHaveCount(0);
  await expect(dialog.getByRole('textbox', { name: 'Length overall', exact: true })).toBeFocused();
  await expect(select.getByText('Catamaran', { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
