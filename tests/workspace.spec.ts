import { test, expect } from '@playwright/test';
test('create, persist, edit, filter, export, delete and undo an entry', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Great work deserves a record.')).toBeVisible();
  await page.getByRole('button', { name: 'Log time', exact: true }).click();
  await page.getByLabel('New client name').fill('Test Legal Client');
  await page.getByLabel('Hours', { exact: true }).fill('1');
  await page.getByLabel('Minutes', { exact: true }).fill('15');
  await page.getByLabel('Description').fill('Contract review');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: 'Test Legal Client Contract review' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('cell', { name: 'Test Legal Client Contract review' }),
  ).toBeVisible();
  await page
    .getByRole('button', {
      name: 'Edit Test Legal Client: Contract review',
      exact: true,
    })
    .click();
  await page.getByLabel('Hours', { exact: true }).fill('2');
  await page.getByRole('checkbox').uncheck();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: '2h 15m', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'Non-billable', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Filter by billability' })
    .selectOption('billable');
  await expect(page.getByText('A little breathing room.')).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Filter by billability' })
    .selectOption('all');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/counsel-time.*\.csv/);
  await page
    .getByRole('button', { name: 'Delete Test Legal Client: Contract review' })
    .click();
  await page.getByRole('button', { name: 'Delete entry', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: 'Test Legal Client Contract review' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: 'Test Legal Client Contract review' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Reports', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Time by client' }),
  ).toBeVisible();
  await expect(page.locator('.report-hours')).toContainText('2h 15m');
  await page.getByRole('button', { name: 'Clients', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Test Legal Client', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test('sample data, search, week navigation and keyboard dialog dismissal', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Load a sample workspace/ }).click();
  await expect(page.locator('tbody tr')).toHaveCount(9);
  await page
    .getByRole('textbox', { name: 'Search entries' })
    .fill('term sheet');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(page.getByText('A little breathing room.')).toBeVisible();
  await page.getByRole('button', { name: 'This week', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(9);
  await page.getByRole('button', { name: 'Log time', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test('validates duration and preserves the form on error', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Log time', exact: true }).click();
  await page.getByLabel('New client name').fill('Zero Duration Client');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'between 1 minute and 24 hours',
  );
  await expect(page.getByLabel('New client name')).toHaveValue(
    'Zero Duration Client',
  );
  await page.getByLabel('Minutes', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Save entry', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: '0h 01m', exact: true }),
  ).toBeVisible();
});

test('backs up data, validates imports, and confirms before restoring', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Load a sample workspace/ }).click();
  await page.getByRole('button', { name: 'Manage data', exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download a backup/ }).click();
  expect((await downloading).suggestedFilename()).toMatch(
    /counsel-backup.*\.json/,
  );
  await page.getByLabel('Backup file').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole('alert')).toContainText(
    'not a supported Counsel backup',
  );
  await page.getByLabel('Backup file').setInputFiles({
    name: 'empty.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":1,"clients":[],"entries":[]}'),
  });
  await expect(page.getByText('Replace this workspace?')).toBeVisible();
  await expect(page.getByText('9 entries · 4 clients')).toBeVisible();
  await page.getByRole('button', { name: 'Replace and restore' }).click();
  await expect(page.getByText('Great work deserves a record.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Great work deserves a record.')).toBeVisible();
});
