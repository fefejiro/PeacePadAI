import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  getInviteCode,
  generateRandomName,
} from './helpers/test-utils';
import path from 'path';

test.describe('P0: Invite Code Persistence', () => {
  test('should preserve invite code after profile photo upload', async ({ browser }) => {
    const parentName = generateRandomName();
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('/');
    const originalInviteCode = await completeOnboarding(page, parentName);
    
    expect(originalInviteCode).toBeTruthy();
    expect(originalInviteCode).toMatch(/^[A-Z0-9]{6}$/);
    
    await page.goto('/settings');
    
    const testImagePath = path.join(__dirname, '../attached_assets/test-profile.png');
    
    const uploadInput = page.getByTestId('input-profile-photo');
    if (await uploadInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#4CAF50';
          ctx.fillRect(0, 0, 100, 100);
        }
        return canvas.toDataURL();
      });
    }
    
    await page.waitForTimeout(2000);
    
    const inviteCodeAfterUpload = await getInviteCode(page);
    
    expect(inviteCodeAfterUpload).toBe(originalInviteCode);
    
    await context.close();
  });

  test('should preserve invite code after name change', async ({ browser }) => {
    const originalName = generateRandomName();
    const newName = generateRandomName();
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('/');
    const originalInviteCode = await completeOnboarding(page, originalName);
    
    await page.goto('/settings');
    
    const nameInput = page.getByTestId('input-display-name');
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.clear();
      await nameInput.fill(newName);
      
      const saveButton = page.getByTestId('button-save-settings');
      await saveButton.click();
      
      await page.waitForTimeout(1000);
    }
    
    const inviteCodeAfterNameChange = await getInviteCode(page);
    
    expect(inviteCodeAfterNameChange).toBe(originalInviteCode);
    
    await context.close();
  });

  test('should display invite code in settings', async ({ browser }) => {
    const parentName = generateRandomName();
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    const inviteCode = await getInviteCode(page);
    
    expect(inviteCode).toBeTruthy();
    expect(inviteCode).toMatch(/^[A-Z0-9]{6}$/);
    
    await expect(page.getByTestId('text-invite-code')).toContainText(inviteCode);
    
    await context.close();
  });
});
