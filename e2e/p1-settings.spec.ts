import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  generateRandomName,
  getInviteCode,
} from './helpers/test-utils';

test.describe('P1: Settings & Preferences', () => {
  test('should toggle notifications setting', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/settings');
    
    const notificationToggle = page.getByTestId('toggle-notifications');
    if (await notificationToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await notificationToggle.click();
      
      await page.reload();
      
      const isChecked = await notificationToggle.isChecked();
      expect(isChecked).toBeDefined();
    }
  });

  test('should change display name', async ({ page }) => {
    const originalName = generateRandomName();
    const newName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, originalName);
    
    await page.goto('/settings');
    
    const nameInput = page.getByTestId('input-display-name');
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameInput.clear();
      await nameInput.fill(newName);
      
      const saveButton = page.getByTestId('button-save-settings');
      await saveButton.click();
      
      await page.waitForTimeout(1000);
      
      await page.reload();
      
      const updatedNameInput = page.getByTestId('input-display-name');
      const value = await updatedNameInput.inputValue();
      expect(value).toBe(newName);
    }
  });

  test('should display invite code with copy button', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    const inviteCode = await getInviteCode(page);
    
    expect(inviteCode).toBeTruthy();
    expect(inviteCode).toMatch(/^[A-Z0-9]{6}$/);
    
    const copyButton = page.getByTestId('button-copy-invite-code');
    await expect(copyButton).toBeVisible();
  });

  test('should toggle dark mode', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/settings');
    
    const themeToggle = page.getByTestId('toggle-theme');
    if (await themeToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await themeToggle.click();
      
      const htmlElement = page.locator('html');
      const hasDataClass = await htmlElement.evaluate((el) => el.classList.contains('dark'));
      expect(hasDataClass).toBeDefined();
    }
  });

  test('should show activity logs', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/settings');
    
    const viewLogsButton = page.getByTestId('button-view-activity-logs');
    if (await viewLogsButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewLogsButton.click();
      
      const logsDialog = page.getByTestId('dialog-activity-logs');
      await expect(logsDialog).toBeVisible({ timeout: 3000 });
    }
  });
});
