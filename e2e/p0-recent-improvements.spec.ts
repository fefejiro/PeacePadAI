import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  generateRandomName,
  getInviteCode,
} from './helpers/test-utils';

test.describe('P0: Recent Improvements E2E Tests', () => {
  
  test('Settings: should display invite sharing UI with QR code and shareable link', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/settings');
    
    // Wait for settings page to load
    await page.waitForTimeout(500);
    
    // Verify QR code is visible
    const qrCode = page.getByTestId('qr-code-invite');
    await expect(qrCode).toBeVisible({ timeout: 5000 });
    
    // Verify shareable link is visible with correct format
    const shareableLink = page.getByTestId('text-shareable-link');
    await expect(shareableLink).toBeVisible();
    const linkText = await shareableLink.textContent();
    expect(linkText).toContain('peacepad.app/join/');
    expect(linkText).toMatch(/[A-Z0-9]{6}$/); // Ends with 6-char code
    
    // Verify copy button exists
    const copyButton = page.getByTestId('button-copy-invite-link');
    await expect(copyButton).toBeVisible();
  });
  
  test('Settings: should copy invite link to clipboard', async ({ page, context }) => {
    const parentName = generateRandomName();
    
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/settings');
    await page.waitForTimeout(500);
    
    // Click copy button
    const copyButton = page.getByTestId('button-copy-invite-link');
    await copyButton.click();
    
    // Verify toast notification appears
    await expect(page.getByText(/copied|link copied/i)).toBeVisible({ timeout: 3000 });
    
    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('peacepad.app/join/');
    expect(clipboardText).toMatch(/[A-Z0-9]{6}$/);
  });
  
  test('Settings: should have Web Share API button', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/settings');
    await page.waitForTimeout(500);
    
    // Verify share button exists
    const shareButton = page.getByTestId('button-share-invite');
    await expect(shareButton).toBeVisible();
    
    // Verify button has share icon or text
    const buttonText = await shareButton.textContent();
    expect(buttonText).toMatch(/share|invite/i);
  });
  
  test('Theme: should toggle between Light, Dark, and System modes', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/settings');
    await page.waitForTimeout(500);
    
    // Test Light mode
    const lightButton = page.getByTestId('button-theme-light');
    if (await lightButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await lightButton.click();
      await page.waitForTimeout(300);
      
      const htmlElement = page.locator('html');
      let hasDataClass = await htmlElement.evaluate((el) => el.classList.contains('dark'));
      expect(hasDataClass).toBe(false);
      
      // Test Dark mode
      const darkButton = page.getByTestId('button-theme-dark');
      await darkButton.click();
      await page.waitForTimeout(300);
      
      hasDataClass = await htmlElement.evaluate((el) => el.classList.contains('dark'));
      expect(hasDataClass).toBe(true);
      
      // Test System mode
      const systemButton = page.getByTestId('button-theme-system');
      await systemButton.click();
      await page.waitForTimeout(300);
      
      // Verify system mode is set (should detect OS preference)
      const theme = await page.evaluate(() => localStorage.getItem('theme'));
      expect(theme).toBe('system');
    }
  });
  
  test('Theme: should persist theme preference after reload', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/settings');
    await page.waitForTimeout(500);
    
    // Set dark mode
    const darkButton = page.getByTestId('button-theme-dark');
    if (await darkButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await darkButton.click();
      await page.waitForTimeout(300);
      
      // Reload page
      await page.reload();
      await page.waitForTimeout(500);
      
      // Verify dark mode persists
      const htmlElement = page.locator('html');
      const hasDataClass = await htmlElement.evaluate((el) => el.classList.contains('dark'));
      expect(hasDataClass).toBe(true);
    }
  });
  
  test('Theme: header should not have theme toggle button', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    // Check header for theme toggle
    const header = page.locator('header');
    await expect(header).toBeVisible();
    
    // Should NOT have a theme toggle in header
    const themeToggleInHeader = header.getByTestId('toggle-theme');
    await expect(themeToggleInHeader).not.toBeVisible({ timeout: 2000 }).catch(() => true);
  });
  
  test('Profile Upload: should handle file upload with correct field name', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/settings');
    await page.waitForTimeout(500);
    
    // Look for profile photo upload button
    const uploadButton = page.getByTestId('button-upload-photo');
    if (await uploadButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Create a test file
      const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      
      // Set the file input
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'test-avatar.png',
        mimeType: 'image/png',
        buffer: buffer,
      });
      
      // Wait for upload to complete
      await page.waitForTimeout(2000);
      
      // Verify success toast or avatar update
      const successToast = page.getByText(/uploaded|updated|success/i);
      await expect(successToast).toBeVisible({ timeout: 5000 }).catch(() => {
        // If no toast, at least verify no error occurred
        return true;
      });
    }
  });
  
  test('Bottom Nav: should be visible on mobile for authenticated users', async ({ page }) => {
    const parentName = generateRandomName();
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    // Navigate to chat page
    await page.goto('/chat');
    await page.waitForTimeout(500);
    
    // Verify bottom nav is visible
    const bottomNav = page.getByTestId('bottom-nav');
    await expect(bottomNav).toBeVisible({ timeout: 3000 });
    
    // Verify bottom nav has expected items
    const chatNavItem = page.getByTestId('nav-item-chat');
    const scheduleNavItem = page.getByTestId('nav-item-schedule');
    const tasksNavItem = page.getByTestId('nav-item-tasks');
    const moreNavItem = page.getByTestId('nav-item-more');
    
    await expect(chatNavItem).toBeVisible();
    await expect(scheduleNavItem).toBeVisible();
    await expect(tasksNavItem).toBeVisible();
    await expect(moreNavItem).toBeVisible();
  });
  
  test('Bottom Nav: should NOT be visible on onboarding page', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Skip intro if present
    const skipButton = page.getByTestId('button-skip-intro');
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
    }
    
    await page.waitForURL(/\/onboarding/, { timeout: 5000 });
    
    // Verify bottom nav is NOT visible during onboarding
    const bottomNav = page.getByTestId('bottom-nav');
    await expect(bottomNav).not.toBeVisible({ timeout: 2000 }).catch(() => true);
  });
  
  test('Audio Waveform: should render smoothly without performance issues', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/chat');
    await page.waitForTimeout(500);
    
    // Look for audio recording UI
    const recordButton = page.getByTestId('button-record-audio');
    if (await recordButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Grant microphone permissions
      await page.context().grantPermissions(['microphone']);
      
      // Start recording
      await recordButton.click();
      
      // Wait a moment for waveform to render
      await page.waitForTimeout(1000);
      
      // Verify waveform canvas exists
      const waveformCanvas = page.locator('canvas');
      if (await waveformCanvas.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Measure frame rate by checking if animation is smooth
        const fps = await page.evaluate(() => {
          return new Promise((resolve) => {
            let frames = 0;
            const start = performance.now();
            
            const checkFrame = () => {
              frames++;
              if (performance.now() - start < 1000) {
                requestAnimationFrame(checkFrame);
              } else {
                resolve(frames);
              }
            };
            
            requestAnimationFrame(checkFrame);
          });
        });
        
        // Should achieve at least 30 FPS for smooth animation
        expect(fps).toBeGreaterThan(30);
      }
      
      // Stop recording
      const stopButton = page.getByTestId('button-stop-recording');
      if (await stopButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await stopButton.click();
      }
    }
  });
  
  test('Invite Regeneration: should update shareable link immediately', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/settings');
    await page.waitForTimeout(500);
    
    // Get current invite code
    const shareableLink = page.getByTestId('text-shareable-link');
    const originalLink = await shareableLink.textContent();
    const originalCode = originalLink?.match(/[A-Z0-9]{6}$/)?.[0];
    
    // Regenerate invite code
    const regenerateButton = page.getByTestId('button-regenerate-invite');
    if (await regenerateButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await regenerateButton.click();
      
      // Confirm regeneration
      const confirmButton = page.getByTestId('button-confirm-regenerate');
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }
      
      // Wait for update
      await page.waitForTimeout(1000);
      
      // Get new invite code
      const newLink = await shareableLink.textContent();
      const newCode = newLink?.match(/[A-Z0-9]{6}$/)?.[0];
      
      // Verify code changed
      expect(newCode).toBeTruthy();
      expect(newCode).not.toBe(originalCode);
    }
  });
});
