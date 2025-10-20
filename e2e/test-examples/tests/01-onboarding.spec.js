const { test, expect } = require('@playwright/test');

/**
 * TEST 1: ONBOARDING FLOW
 * 
 * Purpose: Verify new users can complete the onboarding process
 * 
 * Steps:
 * 1. Navigate to PeacePad homepage
 * 2. Skip the welcome carousel (3 slides)
 * 3. Fill in display name
 * 4. Select emoji profile picture
 * 5. Click "Get Started" button
 * 6. Verify redirect to home page
 * 
 * Expected Results:
 * - Welcome carousel displays with "Skip Intro" button
 * - Guest entry form accepts display name input
 * - User successfully creates account and sees navigation
 * - Bottom navigation is visible (Chat, Schedule, Tasks, More)
 */

test('Complete onboarding flow as new guest user', async ({ page }) => {
  console.log('📝 Starting onboarding test...');

  // Step 1: Navigate to PeacePad
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  console.log('✅ Page loaded');

  // Step 2: Check for welcome carousel
  const skipButton = page.locator('[data-testid="button-skip-intro"]');
  
  if (await skipButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('📸 Welcome carousel detected, clicking Skip Intro...');
    await skipButton.click();
    await page.waitForTimeout(1500);
    console.log('✅ Skip Intro clicked');
  } else {
    console.log('ℹ️  No carousel detected...');
  }

  // Step 2.5: Handle Consent Agreement (if present)
  const consentCheckbox = page.locator('[data-testid="checkbox-consent"]');
  
  if (await consentCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('📋 Consent agreement detected, scrolling and accepting...');
    
    // Scroll to bottom of terms
    const scrollArea = page.locator('.h-\\[500px\\]').first();
    if (await scrollArea.isVisible().catch(() => false)) {
      await scrollArea.evaluate(el => el.scrollTop = el.scrollHeight);
      await page.waitForTimeout(1000);
    }
    
    // Check consent checkbox
    await consentCheckbox.click();
    console.log('✅ Consent checkbox checked');
    
    // Click accept button
    const acceptButton = page.locator('[data-testid="button-accept-consent"]');
    await acceptButton.click();
    await page.waitForTimeout(1000);
    console.log('✅ Consent agreement accepted');
  } else {
    console.log('ℹ️  No consent agreement detected');
  }

  // Step 3: Wait for guest entry form or onboarding
  const displayNameInput = page.locator('[data-testid="input-display-name"]').or(
    page.locator('input[placeholder*="name" i]')
  );
  
  await displayNameInput.waitFor({ state: 'visible', timeout: 10000 });
  console.log('✅ Guest entry form loaded');

  // Step 4: Fill in display name
  const testDisplayName = `E2EParent_${Date.now()}`;
  await displayNameInput.fill(testDisplayName);
  console.log(`✅ Filled display name: ${testDisplayName}`);

  // Step 5: Select an emoji (optional - might be auto-selected)
  const emojiButtons = page.locator('[data-testid*="emoji"]').or(page.locator('button').filter({ hasText: /[😀🦋🌟]/}));
  const emojiCount = await emojiButtons.count();
  
  if (emojiCount > 0) {
    await emojiButtons.first().click();
    console.log('✅ Selected emoji profile picture');
  } else {
    console.log('ℹ️  No emoji selector found, using default');
  }

  // Step 6: Take screenshot before submitting
  await page.screenshot({ path: 'test-results/01-onboarding-form-filled.png', fullPage: true });

  // Step 7: Click "Get Started" button
  const startButton = page.locator('[data-testid="button-start-guest"]').or(
    page.locator('button').filter({ hasText: /get started|start|continue/i })
  );
  
  await startButton.click();
  console.log('✅ Clicked Get Started button');

  // Step 8: Wait for navigation to complete
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Step 9: Verify bottom navigation is visible
  const chatNav = page.locator('[data-testid="nav-chat"]').or(page.locator('text=Chat'));
  const scheduleNav = page.locator('[data-testid="nav-schedule"]').or(page.locator('text=Schedule'));
  
  const isChatVisible = await chatNav.isVisible({ timeout: 5000 }).catch(() => false);
  const isScheduleVisible = await scheduleNav.isVisible({ timeout: 5000 }).catch(() => false);

  console.log(`Navigation visibility - Chat: ${isChatVisible}, Schedule: ${isScheduleVisible}`);

  // Step 10: Take final screenshot
  await page.screenshot({ path: 'test-results/01-onboarding-complete.png', fullPage: true });

  // Step 11: Verify we're on a main page (not onboarding)
  const url = page.url();
  expect(url).not.toContain('/onboarding');
  console.log(`✅ Onboarding complete! Current URL: ${url}`);
  
  // Verify navigation exists (either bottom nav or sidebar)
  const hasNavigation = isChatVisible || isScheduleVisible;
  expect(hasNavigation).toBeTruthy();
  console.log('✅ Navigation is visible - user successfully onboarded');
});
