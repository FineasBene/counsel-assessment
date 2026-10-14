import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const violations = async (page: import('@playwright/test').Page) =>
  (
    await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
  ).violations.map((v) => ({
    id: v.id,
    nodes: v.nodes.map((n) => n.target.join(' ')),
  }));

test('dark theme persists and has no WCAG A/AA violations', async ({
  page,
}, info) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage data', exact: true }).click();
  await page.getByRole('button', { name: /Open pilot workspace/ }).click();
  await page.getByRole('button', { name: 'Replace and restore' }).click();
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Previous week' }).click();
  await page.screenshot({
    path: info.outputPath('entries-dark.png'),
    fullPage: true,
  });
  expect(await violations(page)).toEqual([]);
  await page.getByRole('button', { name: 'Weekly review' }).first().click();
  await page.getByLabel('Select visible entries').check();
  await page.screenshot({
    path: info.outputPath('review-dark.png'),
    fullPage: true,
  });
  expect(await violations(page)).toEqual([]);
  await page.getByRole('button', { name: 'Log time', exact: true }).click();
  await page.screenshot({ path: info.outputPath('dialog-dark.png') });
  expect(await violations(page)).toEqual([]);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Manage data', exact: true }).click();
  await page.getByRole('button', { name: /Open pilot workspace/ }).click();
  await expect(page.getByText('Replace this workspace?')).toBeVisible();
  await page.screenshot({ path: info.outputPath('restore-dark.png') });
  expect(await violations(page)).toEqual([]);
});

test('pre-billing warnings are readable in both themes', async ({
  page,
}, info) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Manage data', exact: true }).click();
  await page.getByRole('button', { name: /Open pilot workspace/ }).click();
  await page.getByRole('button', { name: 'Replace and restore' }).click();
  await page.getByRole('button', { name: 'Weekly review' }).first().click();
  await page.getByLabel('Select Weekly team planning').check();
  await page.getByLabel('Bulk action').selectOption('billable');
  await page.getByRole('button', { name: /Apply to 1 selected entry/ }).click();
  await page.getByRole('button', { name: 'Show 1 flagged' }).click();
  await expect(page.locator('.review-row')).toHaveCount(1);
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark')
      await page.getByRole('button', { name: 'Switch to dark theme' }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: info.outputPath(`flags-${theme}.png`) });
    expect(await violations(page)).toEqual([]);
  }
});
