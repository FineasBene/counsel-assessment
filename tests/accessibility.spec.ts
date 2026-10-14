import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('workspace and entry dialog have no WCAG A/AA violations', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Load a sample workspace/ }).click();
  const dashboard = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    dashboard.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
  await page.getByRole('button', { name: 'Log time', exact: true }).click();
  const dialog = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    dialog.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
});
