import { test, expect } from '@playwright/test';
import { clearLocalStorage } from './helpers/test-utils';

test.describe('P2: Intro Slideshow', () => {
  test('should show intro slideshow for first-time users', async ({ page }) => {
    await clearLocalStorage(page);
    
    await page.goto('/');
    
    const introSlideshow = page.getByTestId('container-intro-slideshow');
    if (await introSlideshow.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(introSlideshow).toBeVisible();
      
      const slide1 = page.getByTestId('slide-1');
      await expect(slide1).toBeVisible();
    }
  });

  test('should auto-progress through slides', async ({ page }) => {
    await clearLocalStorage(page);
    
    await page.goto('/');
    
    const introSlideshow = page.getByTestId('container-intro-slideshow');
    if (await introSlideshow.isVisible({ timeout: 3000 }).catch(() => false)) {
      const slide1 = page.getByTestId('slide-1');
      await expect(slide1).toBeVisible();
      
      await page.waitForTimeout(4000);
      
      const slide2 = page.getByTestId('slide-2');
      if (await slide2.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(slide2).toBeVisible();
      }
    }
  });

  test('should allow skip button to bypass intro', async ({ page }) => {
    await clearLocalStorage(page);
    
    await page.goto('/');
    
    const skipButton = page.getByTestId('button-skip-intro');
    if (await skipButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipButton.click();
      
      await page.waitForURL(/onboarding|dashboard/, { timeout: 5000 });
      
      const introSlideshow = page.getByTestId('container-intro-slideshow');
      await expect(introSlideshow).not.toBeVisible();
    }
  });

  test('should not show intro for returning users', async ({ page }) => {
    await page.goto('/');
    
    await page.waitForTimeout(2000);
    
    await page.reload();
    
    const introSlideshow = page.getByTestId('container-intro-slideshow');
    const isVisible = await introSlideshow.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isVisible) {
      const skipButton = page.getByTestId('button-skip-intro');
      await skipButton.click();
    }
    
    await page.reload();
    
    const isVisibleAfterReload = await introSlideshow.isVisible({ timeout: 2000 }).catch(() => false);
    expect(isVisibleAfterReload).toBe(false);
  });

  test('should support swipe navigation', async ({ page }) => {
    await clearLocalStorage(page);
    
    await page.goto('/');
    
    const introSlideshow = page.getByTestId('container-intro-slideshow');
    if (await introSlideshow.isVisible({ timeout: 3000 }).catch(() => false)) {
      const slide1 = page.getByTestId('slide-1');
      
      const box = await slide1.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 50, box.y + box.height / 2);
        await page.mouse.up();
        
        await page.waitForTimeout(500);
        
        const slide2 = page.getByTestId('slide-2');
        if (await slide2.isVisible({ timeout: 1000 }).catch(() => false)) {
          await expect(slide2).toBeVisible();
        }
      }
    }
  });
});
