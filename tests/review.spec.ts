import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

test('Friday review: filtered totals and export, re-review, selection scope', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage data', exact: true }).click();
  await page.getByRole('button', { name: /Open pilot workspace/ }).click();
  await page.getByRole('button', { name: 'Replace and restore' }).click();
  await page.getByRole('button', { name: 'Weekly review' }).first().click();
  await expect(page.getByLabel('Review week', { exact: true })).toHaveValue(
    '2026-09-28',
  );

  // Totals and export follow the filters.
  await page
    .getByLabel('Review client', { exact: true })
    .selectOption('meridian');
  await page
    .getByLabel('Review employee', { exact: true })
    .selectOption('Sofia Keller');
  await page
    .getByLabel('Review status', { exact: true })
    .selectOption('reviewed');
  const rows = page.locator('.review-row');
  const shown = await rows.count();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export view/ }).click();
  const file = await readFile((await (await downloading).path())!, 'utf8');
  const lines = file.trim().split('\r\n').slice(1);
  expect(lines).toHaveLength(shown);
  for (const line of lines) expect(line).toContain('"Sofia Keller"');

  // Selection is cleared, and said to be cleared, when the view changes.
  await page.getByLabel('Review status', { exact: true }).selectOption('all');
  await page.getByLabel('Review employee', { exact: true }).selectOption('all');
  await page.getByLabel('Select visible entries', { exact: true }).check();
  await expect(page.getByText(/in view selected/)).toBeVisible();
  await page.getByLabel('Review client', { exact: true }).selectOption('all');
  await expect(page.getByText('None selected')).toBeVisible();

  // A reviewed entry moved to another client needs review again.
  await page
    .getByLabel('Review client', { exact: true })
    .selectOption('meridian');
  const shareholder = page
    .locator('.review-row')
    .filter({ hasText: 'Shareholder agreement review' })
    .first();
  await expect(
    shareholder.getByRole('button', { name: /^Reopen/ }),
  ).toBeVisible();
  await shareholder.getByRole('checkbox').check();
  await page.getByLabel('Bulk action', { exact: true }).selectOption('client');
  await page
    .getByLabel('Destination client', { exact: true })
    .selectOption('foundation');
  await page.getByRole('button', { name: /Apply to 1 selected entry/ }).click();
  await expect(
    page.getByText(/Moved to Meridian Foundation: 1 entry/),
  ).toBeVisible();
  await page
    .getByLabel('Review client', { exact: true })
    .selectOption('foundation');
  await expect(
    page
      .locator('.review-row')
      .filter({ hasText: 'Shareholder agreement review' })
      .getByRole('button', { name: /^Review / }),
  ).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(axe.violations.map((v) => v.id)).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
