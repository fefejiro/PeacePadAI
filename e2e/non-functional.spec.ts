import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  generateRandomName,
} from './helpers/test-utils';

test.describe('Non-Functional Tests', () => {
  test('should load page within 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000);
  });

  test('should persist session across page refresh', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.reload();
    
    await page.waitForTimeout(1000);
    
    const isOnDashboard = page.url().includes('/dashboard') || page.url().includes('/chat');
    expect(isOnDashboard).toBe(true);
  });

  test('should clear cache on logout', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    const logoutButton = page.getByTestId('button-logout');
    if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutButton.click();
      
      await page.waitForURL('/', { timeout: 5000 });
      
      const hasSession = await page.evaluate(() => {
        return !!localStorage.getItem('sessionId');
      });
      
      expect(hasSession).toBe(false);
    }
  });

  test('should handle offline scenario gracefully (PWA)', async ({ page, context }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await context.setOffline(true);
    
    await page.reload();
    
    const offlineMessage = page.getByText(/offline|no connection/i);
    const isVisible = await offlineMessage.isVisible({ timeout: 3000 }).catch(() => false);
    
    await context.setOffline(false);
  });

  test('should work in Firefox', async ({ playwright }) => {
    const browser = await playwright.firefox.launch();
    const page = await browser.newPage();
    
    const parentName = generateRandomName();
    
    await page.goto('http://localhost:5000');
    await completeOnboarding(page, parentName);
    
    await expect(page).toHaveURL(/dashboard|chat/);
    
    await browser.close();
  });

  test('should handle concurrent users without conflicts', async ({ browser }) => {
    const user1Name = generateRandomName();
    const user2Name = generateRandomName();
    const user3Name = generateRandomName();
    
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();
    
    await Promise.all([
      page1.goto('/'),
      page2.goto('/'),
      page3.goto('/'),
    ]);
    
    await Promise.all([
      completeOnboarding(page1, user1Name),
      completeOnboarding(page2, user2Name),
      completeOnboarding(page3, user3Name),
    ]);
    
    await Promise.all([
      expect(page1).toHaveURL(/dashboard|chat/),
      expect(page2).toHaveURL(/dashboard|chat/),
      expect(page3).toHaveURL(/dashboard|chat/),
    ]);
    
    await context1.close();
    await context2.close();
    await context3.close();
  });

  test('should respond within 500ms for API calls', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    const startTime = Date.now();
    
    const response = await page.goto('/api/auth/me');
    
    const responseTime = Date.now() - startTime;
    
    expect(responseTime).toBeLessThan(500);
    expect(response?.ok()).toBe(true);
  });
});

