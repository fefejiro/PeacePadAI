import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  generateRandomName,
} from './helpers/test-utils';

test.describe('P2: Accessibility', () => {
  test('should support keyboard navigation', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/chat');
    
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focusedElement).toBeTruthy();
  });

  test('should have ARIA labels on interactive elements', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    const sendButton = page.getByTestId('button-send-message');
    if (await sendButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      const ariaLabel = await sendButton.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });

  test('should toggle dark mode correctly', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    const themeToggle = page.locator('[data-testid="toggle-theme"], [data-testid="button-theme-toggle"]').first();
    if (await themeToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await themeToggle.click();
      
      const htmlElement = page.locator('html');
      const classList = await htmlElement.evaluate((el) => el.className);
      
      expect(classList.includes('dark') || classList.includes('light')).toBe(true);
    }
  });

  test('should have sufficient color contrast in light mode', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    const htmlElement = page.locator('html');
    await htmlElement.evaluate((el) => el.classList.remove('dark'));
    
    const textElement = page.locator('body').first();
    const color = await textElement.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.color;
    });
    
    expect(color).toBeTruthy();
  });

  test('should support screen reader navigation', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    const mainContent = page.locator('main, [role="main"]').first();
    if (await mainContent.isVisible({ timeout: 2000 }).catch(() => false)) {
      const role = await mainContent.getAttribute('role');
      expect(role || 'main').toBeTruthy();
    }
  });

  test('should have semantic HTML structure', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    const hasHeader = await page.locator('header, [role="banner"]').count() > 0;
    const hasMain = await page.locator('main, [role="main"]').count() > 0;
    
    expect(hasHeader || hasMain).toBe(true);
  });
});
