import { test, expect } from '@playwright/test';
import WebClient from '../src/utils/WebClient';
import { logger } from '../src/utils/Logger';
import ArgumentHandler from '../src/utils/ArgumentHandler';
import JsonReader from '../src/utils/JsonReader';
import process from 'process';


test('has title', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Playwright/);
});

test('get started link', async ({ page }) => {
  await page.goto('https://playwright.dev/');

  // Click the get started link.
  await page.getByRole('link', { name: 'Get started' }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});

test('example test', async ({ page }) => {
  await page.goto('https://github.com/microsoft/playwright');
  const title = await page.title();
  expect(title).toBe('GitHub - microsoft/playwright: Node.js library to automate Chromium, Firefox and WebKit with a single API');
});

