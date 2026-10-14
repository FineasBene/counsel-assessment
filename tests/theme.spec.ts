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
});
