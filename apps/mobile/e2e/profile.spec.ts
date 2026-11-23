import { expect, test } from '@playwright/test';

test('the vessel form reveals the first invalid group and saves measured values across reload', async ({
  context,
  page,
  baseURL,
}) => {
  await context.route('**/*', (route) =>
    new URL(route.request().url()).origin === baseURL ? route.continue() : route.abort(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Imperial', exact: true }).click();
  await page.getByRole('button', { name: 'Configure vessel', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Configure your vessel', exact: true });
  const field = (name: string) => sheet.getByRole('textbox', { name, exact: true });
  const button = (name: string) => sheet.getByRole('button', { name, exact: true });
  await expect(sheet.getByText('Dimensions in feet · Displacement in pounds')).toBeVisible();
  await expect(sheet.getByRole('heading', { name: 'Anchoring equipment' })).toBeVisible();

  const measured = {
    'Vessel name': 'Measured Vessel',
    'Length overall': '33',
    Beam: '12',
    'Loaded draft': '5',
    Displacement: '11000',
    'Usable rode length': '175',
    'Bow roller above water': '0',
  };
  for (const [label, value] of Object.entries(measured)) await field(label).fill(value);
  const optional = button('Optional air draft');
  await expect(optional).toHaveAttribute('aria-expanded', 'false');
  await optional.click();
  await field('Air draft (optional)').fill('-1');
  await optional.click();
  await expect(optional).toHaveAccessibleDescription('-1 ft');

  const save = button('Save vessel & continue');
  const design = sheet.getByRole('combobox', { name: 'Anchor design', exact: true });
  await save.click();
  await expect(design).toBeFocused();
  await expect(design).toHaveAccessibleDescription(/Anchor type is required/);
  await expect(field('Usable rode length')).toHaveValue('175');
  await design.press('Home');
  await design.press('Enter');
  await save.click();
  const airDraft = field('Air draft (optional)');
  await expect(optional).toHaveAttribute('aria-expanded', 'true');
  await expect(airDraft).toBeFocused();
  await expect(airDraft).toHaveAccessibleDescription(/Air draft must be nonnegative/);
  await airDraft.fill('');
  await save.click();
  const edit = page.getByRole('button', { name: 'Edit vessel', exact: true });
  await expect(edit).toBeVisible();
  await page.reload();
  await edit.click();
  for (const [label, value] of Object.entries(measured))
    await expect(field(label)).toHaveValue(value);
  await expect(design).toContainText('Modern scoop');
  await optional.click();
  await expect(airDraft).toHaveValue('');
  expect(await page.pageErrors()).toEqual([]);
});
