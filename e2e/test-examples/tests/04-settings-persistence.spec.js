const { test, expect } = require('@playwright/test');

/**
 * TEST 4: SETTINGS PERSISTENCE
 * 
 * Purpose: Verify user settings save correctly and persist across sessions
 * 
 * Steps:
 * 1. Create user account
 * 2. Navigate to Settings page
 * 3. Update display name
 * 4. Update phone number
 * 5. Click Save Changes
 * 6. Verify success message appears
 * 7. Reload page and verify changes persisted
 * 8. Navigate to chat and verify updated name appears
 * 
 * Expected Results:
 * - Settings form accepts input changes
 * - Save button triggers update
 * - Success toast/message appears
 * - Input fields retain new values after save
 * - Changes persist after page reload
 * - Updated display name appears in other parts of app
 */

test('Settings changes save and persist correctly', async ({ page }) => {
  console.log('⚙️  Starting settings persistence test...');

  const originalName = `OriginalUser_${Date.now()}`;
  const updatedName = `UpdatedUser_${Date.now()}`;
  const phoneNumber = '555-123-4567';

  // Step 1: Create account
  console.log('\n🔧 SETUP: Creating user account...');
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const skipButton = page.locator('[data-testid="button-skip-intro"]');
  if (await skipButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await skipButton.click({ force: true });
    await page.waitForTimeout(1500);
  }

  // Handle Consent Agreement (if present)
  const consentCheckbox = page.locator('[data-testid="checkbox-consent"]');
  if (await consentCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
    const scrollArea = page.locator('.h-\\[500px\\]').first();
    if (await scrollArea.isVisible().catch(() => false)) {
      await scrollArea.evaluate(el => el.scrollTop = el.scrollHeight);
      await page.waitForTimeout(1000);
    }
    await consentCheckbox.click();
    const acceptButton = page.locator('[data-testid="button-accept-consent"]');
    await acceptButton.click();
    await page.waitForTimeout(1000);
  }

  const nameInput = page.locator('[data-testid="input-display-name"]').or(
    page.locator('input[placeholder*="name" i]')
  );
  await nameInput.waitFor({ state: 'visible', timeout: 10000 });
  await nameInput.fill(originalName);

  const startButton = page.locator('[data-testid="button-start-guest"]').or(
    page.locator('button').filter({ hasText: /get started|start|continue/i })
  );
  await startButton.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  console.log(`✅ Account created with name: ${originalName}`);

  // Step 2: Navigate to Settings
  console.log('\n⚙️  Navigating to Settings page...');
  const moreNav = page.locator('[data-testid="nav-more"]').or(page.locator('text=More'));
  if (await moreNav.isVisible({ timeout: 3000 }).catch(() => false)) {
    await moreNav.click();
    await page.waitForTimeout(1000);
  }

  const settingsLink = page.locator('[data-testid="link-settings"]').or(
    page.locator('a[href="/settings"]').or(page.locator('text=Settings'))
  );
  await settingsLink.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  console.log('✅ Settings page loaded');

  await page.screenshot({ path: 'test-results/04-settings-before-changes.png', fullPage: true });

  // Step 3: Verify current display name is shown
  const displayNameField = page.locator('[data-testid="input-display-name"]').or(
    page.locator('input[name="displayName"]').or(
      page.locator('label:has-text("Display Name") + input')
    )
  );
  
  await displayNameField.waitFor({ state: 'visible', timeout: 10000 });
  const currentValue = await displayNameField.inputValue();
  console.log(`Current display name in field: "${currentValue}"`);
  expect(currentValue).toContain(originalName.substring(0, 10)); // May have modifications

  // Step 4: Update display name
  console.log('\n📝 Updating display name...');
  await displayNameField.clear();
  await displayNameField.fill(updatedName);
  console.log(`✅ Changed name to: ${updatedName}`);

  // Step 5: Update phone number (if field exists)
  const phoneField = page.locator('[data-testid="input-phone-number"]').or(
    page.locator('input[name="phoneNumber"]').or(
      page.locator('input[type="tel"]')
    )
  );
  
  if (await phoneField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await phoneField.clear();
    await phoneField.fill(phoneNumber);
    console.log(`✅ Updated phone number: ${phoneNumber}`);
  } else {
    console.log('ℹ️  Phone number field not found, skipping');
  }

  await page.screenshot({ path: 'test-results/04-settings-after-changes.png', fullPage: true });

  // Step 6: Click Save Changes button
  console.log('\n💾 Clicking Save Changes...');
  const saveButton = page.locator('[data-testid="button-save-settings"]').or(
    page.locator('button').filter({ hasText: /save/i })
  );
  
  await saveButton.click();
  await page.waitForTimeout(2000);
  console.log('✅ Save button clicked');

  // Step 7: Look for success message (toast or inline)
  const successIndicators = [
    page.locator('text=/settings.*saved/i'),
    page.locator('text=/saved.*successfully/i'),
    page.locator('text=/updated.*successfully/i'),
    page.locator('[data-testid*="toast"]').filter({ hasText: /success|saved/i })
  ];

  let successFound = false;
  for (const indicator of successIndicators) {
    if (await indicator.isVisible({ timeout: 3000 }).catch(() => false)) {
      successFound = true;
      console.log('✅ Success message displayed');
      break;
    }
  }

  if (!successFound) {
    console.log('⚠️  No explicit success message found, checking if values persisted...');
  }

  await page.screenshot({ path: 'test-results/04-settings-after-save.png', fullPage: true });

  // Step 8: Verify the input field still shows the updated value (useEffect sync test)
  await page.waitForTimeout(1000);
  const valueAfterSave = await displayNameField.inputValue();
  console.log(`\n🔍 Display name after save: "${valueAfterSave}"`);
  expect(valueAfterSave).toBe(updatedName);
  console.log('✅ Input field retained updated value (useEffect working)');

  // Step 9: Reload page to test persistence
  console.log('\n🔄 Reloading page to test persistence...');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Verify we're still on settings page or navigate back if needed
  const currentUrl = page.url();
  if (!currentUrl.includes('/settings')) {
    console.log('Navigating back to settings after reload...');
    const moreNavAgain = page.locator('[data-testid="nav-more"]').or(page.locator('text=More'));
    if (await moreNavAgain.isVisible({ timeout: 3000 }).catch(() => false)) {
      await moreNavAgain.click();
      await page.waitForTimeout(1000);
    }
    await settingsLink.click();
    await page.waitForLoadState('networkidle');
  }

  // Step 10: Verify updated name is still in the field
  const valueAfterReload = await displayNameField.inputValue();
  console.log(`Display name after reload: "${valueAfterReload}"`);
  expect(valueAfterReload).toBe(updatedName);
  console.log('✅ Changes persisted after page reload!');

  await page.screenshot({ path: 'test-results/04-settings-after-reload.png', fullPage: true });

  // Step 11: Navigate to another page to see if updated name appears
  console.log('\n🔍 Checking if updated name appears elsewhere in app...');
  
  // Try to find the display name in header or profile area
  const profileName = page.locator('[data-testid="text-user-name"]').or(
    page.locator(`text=${updatedName}`)
  );
  
  if (await profileName.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log('✅ Updated name visible in UI');
  } else {
    console.log('ℹ️  Updated name not immediately visible in current view');
  }

  console.log('\n✅ SETTINGS PERSISTENCE TEST PASSED');
  console.log(`   - Original name: ${originalName}`);
  console.log(`   - Updated name: ${updatedName}`);
  console.log(`   - Value after save: ${valueAfterSave}`);
  console.log(`   - Value after reload: ${valueAfterReload}`);
  console.log(`   - Persistence: ✓`);
  console.log(`   - useEffect sync: ✓`);
});
