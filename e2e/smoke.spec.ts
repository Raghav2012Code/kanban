import { expect, test, type Page } from '@playwright/test';

/**
 * The paths jsdom cannot see: the native Filters popover (top layer, Escape,
 * outside-click dismissal, focus return, viewport clamping) and filing a card
 * end to end in a real browser.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('region', { name: 'Backlog column' }).waitFor();
});

function filtersTrigger(page: Page) {
  return page.getByRole('button', { name: 'Filters', exact: true });
}

test('Filters opens the popover and Escape closes it, returning focus to the trigger', async ({ page }) => {
  const trigger = filtersTrigger(page);
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');

  await trigger.click();
  const panel = page.locator('#filters-panel');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(panel.getByRole('combobox', { name: 'Filter by priority' })).toBeVisible();

  await panel.getByRole('button', { name: /Overdue only/ }).focus();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
});

test('an outside click closes the Filters popover', async ({ page }) => {
  const trigger = filtersTrigger(page);
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');

  await page.getByRole('heading', { name: 'Docket' }).click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('the Filters panel stays inside a small viewport and scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 400 });
  await filtersTrigger(page).click();
  const panel = page.locator('#filters-panel');

  const box = await panel.boundingBox();
  expect(box, 'the panel must have a laid-out box').not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  expect(box!.y + box!.height).toBeLessThanOrEqual(400);

  const scrollable = await panel.evaluate(
    (element) => element.scrollHeight > element.clientHeight && getComputedStyle(element).overflowY === 'auto',
  );
  expect(scrollable, 'a panel taller than the viewport must scroll instead of clipping').toBe(true);
});

test('filing a card works in a real browser', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.getByRole('region', { name: 'Backlog column' }).getByRole('button', { name: 'File card' }).click();
  await page.getByRole('textbox', { name: 'Card title' }).fill('E2E smoke card');
  await page.getByRole('button', { name: 'Save card' }).click();
  await expect(page.getByRole('group', { name: 'E2E smoke card' })).toBeVisible();
  expect(errors, 'filing a card must not throw in the page').toEqual([]);
});
