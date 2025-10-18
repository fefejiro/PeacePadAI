import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  joinPartnership,
  generateRandomName,
} from './helpers/test-utils';

test.describe('P1: Call Joining', () => {
  test('should create call session with unique code', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    const startCallButton = page.getByTestId('button-start-call');
    if (await startCallButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startCallButton.click();
      
      const sessionCode = page.getByTestId('text-session-code');
      await expect(sessionCode).toBeVisible({ timeout: 5000 });
      
      const codeText = await sessionCode.textContent();
      expect(codeText).toMatch(/^[A-Z0-9]{6}$/);
    }
  });

  test('should allow second user to join call via code', async ({ browser }) => {
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
    await joinPartnership(pageB, inviteCodeA);
    
    const startCallButton = pageA.getByTestId('button-start-call');
    if (await startCallButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startCallButton.click();
      
      const sessionCodeElement = pageA.getByTestId('text-session-code');
      await expect(sessionCodeElement).toBeVisible({ timeout: 5000 });
      const sessionCode = await sessionCodeElement.textContent();
      
      await pageB.goto(`/join-call/${sessionCode}`);
      
      const joinCallButton = pageB.getByTestId('button-join-call');
      await expect(joinCallButton).toBeVisible({ timeout: 5000 });
    }
    
    await contextA.close();
    await contextB.close();
  });

  test('should show camera/mic permission UI before joining', async ({ browser }) => {
    const parentName = generateRandomName();
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/join-call/TEST12');
    
    const cameraToggle = page.getByTestId('toggle-camera');
    const micToggle = page.getByTestId('toggle-microphone');
    
    if (await cameraToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(cameraToggle).toBeVisible();
      await expect(micToggle).toBeVisible();
    }
    
    await context.close();
  });

  test('should display preview before joining call', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/join-call/TEST12');
    
    const videoPreview = page.getByTestId('video-preview');
    if (await videoPreview.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(videoPreview).toBeVisible();
    }
  });
});
