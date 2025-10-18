import { test, expect } from '@playwright/test';
import {
  createGuestUser,
  completeOnboarding,
  joinPartnership,
  generateRandomName,
  getInviteCode,
} from './helpers/test-utils';

test.describe('P0: Partnership Flow', () => {
  test('should allow two users to create partnership via invite code', async ({ browser }) => {
    const parentAName = generateRandomName();
    const parentBName = generateRandomName();
    
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    await pageA.goto('/');
    const inviteCodeA = await completeOnboarding(pageA, parentAName);
    
    expect(inviteCodeA).toBeTruthy();
    expect(inviteCodeA).toMatch(/^[A-Z0-9]{6}$/);
    
    await pageB.goto('/');
    await completeOnboarding(pageB, parentBName);
    
    await joinPartnership(pageB, inviteCodeA);
    
    await expect(pageB.getByText(/partnership.*created|connected/i)).toBeVisible({
      timeout: 10000,
    });
    
    await pageA.reload();
    await expect(pageA.getByText(parentBName)).toBeVisible({ timeout: 10000 });
    
    await contextA.close();
    await contextB.close();
  });

  test('should show real-time WebSocket notification when partnership is created', async ({ browser }) => {
    const parentAName = generateRandomName();
    const parentBName = generateRandomName();
    
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    await pageA.goto('/');
    const inviteCodeA = await completeOnboarding(pageA, parentAName);
    
    await pageB.goto('/');
    await completeOnboarding(pageB, parentBName);
    
    const toastPromise = pageA.waitForSelector('[data-testid*="toast"]', { timeout: 15000 });
    
    await joinPartnership(pageB, inviteCodeA);
    
    const toast = await toastPromise;
    const toastText = await toast.textContent();
    expect(toastText).toContain(parentBName);
    
    await contextA.close();
    await contextB.close();
  });

  test('should reject invalid invite codes', async ({ browser }) => {
    const parentName = generateRandomName();
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    const addCoParentButton = page.getByTestId('button-add-coparent');
    await addCoParentButton.click();
    
    const inviteCodeInput = page.getByTestId('input-invite-code');
    await inviteCodeInput.fill('INVALID');
    
    const joinButton = page.getByTestId('button-join-partnership');
    await joinButton.click();
    
    await expect(page.getByText(/invalid.*code|not found/i)).toBeVisible({ timeout: 5000 });
    
    await context.close();
  });

  test('should prevent user from joining their own invite code', async ({ browser }) => {
    const parentName = generateRandomName();
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('/');
    const inviteCode = await completeOnboarding(page, parentName);
    
    const addCoParentButton = page.getByTestId('button-add-coparent');
    await addCoParentButton.click();
    
    const inviteCodeInput = page.getByTestId('input-invite-code');
    await inviteCodeInput.fill(inviteCode);
    
    const joinButton = page.getByTestId('button-join-partnership');
    await joinButton.click();
    
    await expect(page.getByText(/cannot.*join.*own|yourself/i)).toBeVisible({ timeout: 5000 });
    
    await context.close();
  });
});
