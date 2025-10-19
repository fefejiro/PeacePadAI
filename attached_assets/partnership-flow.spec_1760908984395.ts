
import { test, expect } from '@playwright/test';
import { generateRandomName } from '../helpers/test-utils';

test('AppClose-style invite link partnership flow', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  const parentA = generateRandomName();
  const parentB = generateRandomName();

  console.log(`Simulating partnership: ${parentA} ↔ ${parentB}`);

  // Parent A creates invite link
  await pageA.goto('http://localhost:5000');
  await pageA.click('[data-testid="create-partnership"]');
  const inviteLink = await pageA.locator('[data-testid="share-link"]').textContent();
  console.log(`Generated link: ${inviteLink}`);

  // Parent B joins via invite link
  await pageB.goto(inviteLink || '');
  await expect(pageB.locator('[data-testid="partner-connected"]')).toBeVisible();

  // Validate real-time sync
  await pageA.locator('[data-testid="chat-input"]').fill('Hello from Parent A');
  await pageA.locator('[data-testid="send-message"]').click();

  await expect(pageB.locator('[data-testid="chat-message"]')).toContainText('Hello from Parent A');

  await contextA.close();
  await contextB.close();
});
