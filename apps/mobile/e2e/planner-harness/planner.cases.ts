import { expect, test } from '@playwright/test';
test('map selection and handoff use current proposed coordinates, while invalid input focuses', async ({ page }) => {
 await page.goto('/');
 const latitude = page.getByRole('textbox', { name: 'Latitude' }); const longitude = page.getByRole('textbox', { name: 'Longitude' });
 await page.getByRole('checkbox', { name: /Confirm actual depth/ }).click();
 await page.getByRole('button', { name: 'Choose point on map' }).click();
 await page.getByRole('button', { name: 'Test map point' }).click();
 await expect(latitude).toHaveValue('43.2'); await expect(longitude).toHaveValue('16.2');
 await expect(page.getByRole('checkbox', { name: /Confirm actual depth/ })).not.toBeChecked();
 await latitude.fill('99'); await page.getByRole('button', { name: 'View anchor watch requirements' }).click();
 await expect(latitude).toBeFocused(); await expect(page.getByTestId('handoff')).toHaveText('null');
 await latitude.fill('43.3'); await longitude.fill('16.3');
 await page.getByRole('button', { name: 'View anchor watch requirements' }).click();
 await expect(page.getByTestId('handoff')).toHaveText('{"point":[16.3,43.3]}');
});
