import { expect, test } from '@playwright/test';

test('home page shows department navigation and loads without errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Women' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Kids' }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('browse → filter by size → open product → pick size → add to bag → bag shows server price', async ({ page }) => {
  await page.goto('/shop?department=men');
  await page.getByRole('link', { name: /Kasavu/ }).first().click();
  await page.getByRole('radio', { name: 'M' }).click();
  await page.getByRole('button', { name: 'Add to bag' }).click();
  await expect(page.getByText('Added to your bag')).toBeVisible();
  await page.goto('/cart');
  await expect(page.getByText('Order summary')).toBeVisible();
  await expect(page.getByText(/₹1,95,000/).first()).toBeVisible();
});

test('out-of-stock size cannot be selected', async ({ page }) => {
  await page.goto('/shop?department=men');
  await page.getByRole('link', { name: /Kasavu/ }).first().click();
  await expect(page.getByRole('radio', { name: 'XXL' })).toBeDisabled();
});

test('coupon applies and invalid coupon is explained', async ({ page }) => {
  await page.goto('/shop?department=men'); await page.getByRole('link', { name: /Kasavu/ }).first().click();
  await page.getByRole('radio', { name: 'L' }).click(); await page.getByRole('button', { name: 'Add to bag' }).click();
  await page.goto('/cart');
  await page.getByLabel('Coupon code').fill('NOPE'); await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText(/not valid/i)).toBeVisible();
  await page.getByLabel('Coupon code').fill('WELCOME10'); await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText(/applied/i)).toBeVisible();
});

test('size guide shows Indian charts', async ({ page }) => {
  await page.goto('/size-guide');
  await expect(page.getByRole('heading', { name: /Women's clothing/ })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'XXL' }).first()).toBeVisible();
});

test('checkout validates the form before calling the server', async ({ page }) => {
  await page.goto('/shop?department=men'); await page.getByRole('link', { name: /Kasavu/ }).first().click();
  await page.getByRole('radio', { name: 'S' }).click(); await page.getByRole('button', { name: 'Add to bag' }).click();
  await page.goto('/checkout');
  await page.getByRole('button', { name: /^Pay/ }).click();
  await expect(page.getByText('Enter your full name')).toBeVisible();
  await expect(page.getByText('Enter a valid 10-digit mobile number')).toBeVisible();
});

test('admin area redirects to login when not signed in', async ({ page }) => {
  await page.goto('/admin/orders');
  await expect(page).toHaveURL(/\/admin\/login/);
});
