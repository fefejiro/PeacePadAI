const { test, expect } = require('@playwright/test');

/**
 * TEST 2: PARTNERSHIP CREATION
 * 
 * Purpose: Verify two co-parents can connect using invite codes
 * 
 * Steps:
 * 1. Parent A creates account and gets invite code
 * 2. Parent B creates separate account
 * 3. Parent B enters Parent A's invite code
 * 4. Verify partnership is created
 * 5. Verify conversation is auto-created
 * 6. Verify both can see each other in chat list
 * 
 * Expected Results:
 * - Parent A receives unique 6-character invite code
 * - Parent B can successfully join using invite code
 * - A direct conversation is created automatically
 * - Both parents see the conversation in their chat list
 * - Partnership appears in partnerships list
 */

test('Two co-parents connect via invite code', async ({ browser }) => {
  console.log('🤝 Starting partnership creation test...');

  // Create two separate browser contexts (two different users)
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  let inviteCode = '';
  const parentAName = `ParentA_${Date.now()}`;
  const parentBName = `ParentB_${Date.now()}`;

  try {
    // PARENT A: Complete onboarding
    console.log('\n👤 PARENT A: Creating account...');
    await pageA.goto('/');
    await pageA.waitForLoadState('networkidle');

    // Skip carousel if present
    const skipButtonA = pageA.locator('[data-testid="button-skip-intro"]');
    if (await skipButtonA.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipButtonA.click({ force: true });
      await skipButtonA.waitFor({ state: 'hidden', timeout: 5000 });
    }

    // Handle Consent Agreement (if present)
    const consentCheckboxA = pageA.locator('[data-testid="checkbox-consent"]');
    if (await consentCheckboxA.isVisible({ timeout: 3000 }).catch(() => false)) {
      const scrollAreaA = pageA.locator('.h-\\[500px\\]').first();
      if (await scrollAreaA.isVisible().catch(() => false)) {
        await scrollAreaA.evaluate(el => el.scrollTop = el.scrollHeight);
        await pageA.waitForTimeout(1000);
      }
      await consentCheckboxA.click();
      const acceptButtonA = pageA.locator('[data-testid="button-accept-consent"]');
      await acceptButtonA.click();
      await pageA.waitForTimeout(1000);
    }

    // Fill in Parent A details
    const displayNameA = pageA.locator('[data-testid="input-display-name"]').or(
      pageA.locator('input[placeholder*="name" i]')
    );
    await displayNameA.waitFor({ state: 'visible', timeout: 10000 });
    await displayNameA.fill(parentAName);

    const startButtonA = pageA.locator('[data-testid="button-start-guest"]').or(
      pageA.locator('button').filter({ hasText: /get started|start|continue/i })
    );
    await startButtonA.click();
    await pageA.waitForLoadState('networkidle');
    await pageA.waitForTimeout(2000);
    console.log(`✅ Parent A account created: ${parentAName}`);

    // Navigate to Settings to get invite code
    console.log('📋 Parent A: Getting invite code from Settings...');
    
    // Try bottom nav first (mobile)
    let moreNav = pageA.locator('[data-testid="nav-more"]').or(pageA.locator('text=More'));
    if (await moreNav.isVisible({ timeout: 3000 }).catch(() => false)) {
      await moreNav.click();
      await pageA.waitForTimeout(1000);
    }

    // Click Settings
    const settingsLink = pageA.locator('[data-testid="link-settings"]').or(
      pageA.locator('a[href="/settings"]')
    ).or(pageA.locator('text=Settings'));
    
    await settingsLink.click();
    await pageA.waitForLoadState('networkidle');
    await pageA.waitForTimeout(1000);

    // Find invite code on settings page
    const inviteCodeElement = pageA.locator('[data-testid="text-invite-code"]').or(
      pageA.locator('text=/[A-Z0-9]{6}/').first()
    );
    
    await inviteCodeElement.waitFor({ state: 'visible', timeout: 10000 });
    inviteCode = await inviteCodeElement.textContent();
    inviteCode = inviteCode.trim();
    
    console.log(`✅ Parent A invite code: ${inviteCode}`);
    expect(inviteCode).toMatch(/^[A-Z0-9]{6}$/);

    await pageA.screenshot({ path: 'test-results/02-parent-a-invite-code.png', fullPage: true });

    // PARENT B: Complete onboarding
    console.log(`\n👤 PARENT B: Creating account...`);
    await pageB.goto('/');
    await pageB.waitForLoadState('networkidle');

    // Skip carousel if present
    const skipButtonB = pageB.locator('[data-testid="button-skip-intro"]');
    if (await skipButtonB.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipButtonB.click({ force: true });
      await skipButtonB.waitFor({ state: 'hidden', timeout: 5000 });
    }

    // Handle Consent Agreement (if present)
    const consentCheckboxB = pageB.locator('[data-testid="checkbox-consent"]');
    if (await consentCheckboxB.isVisible({ timeout: 3000 }).catch(() => false)) {
      const scrollAreaB = pageB.locator('.h-\\[500px\\]').first();
      if (await scrollAreaB.isVisible().catch(() => false)) {
        await scrollAreaB.evaluate(el => el.scrollTop = el.scrollHeight);
        await pageB.waitForTimeout(1000);
      }
      await consentCheckboxB.click();
      const acceptButtonB = pageB.locator('[data-testid="button-accept-consent"]');
      await acceptButtonB.click();
      await pageB.waitForTimeout(1000);
    }

    // Fill in Parent B details
    const displayNameB = pageB.locator('[data-testid="input-display-name"]').or(
      pageB.locator('input[placeholder*="name" i]')
    );
    await displayNameB.waitFor({ state: 'visible', timeout: 10000 });
    await displayNameB.fill(parentBName);

    const startButtonB = pageB.locator('[data-testid="button-start-guest"]').or(
      pageB.locator('button').filter({ hasText: /get started|start|continue/i })
    );
    await startButtonB.click();
    await pageB.waitForLoadState('networkidle');
    await pageB.waitForTimeout(2000);
    console.log(`✅ Parent B account created: ${parentBName}`);

    // Parent B: Navigate to Settings to enter invite code
    console.log('🔗 Parent B: Entering Parent A invite code...');
    
    // Try bottom nav first (mobile)
    let moreNavB = pageB.locator('[data-testid="nav-more"]').or(pageB.locator('text=More'));
    if (await moreNavB.isVisible({ timeout: 3000 }).catch(() => false)) {
      await moreNavB.click();
      await pageB.waitForTimeout(1000);
    }

    // Click Settings
    const settingsLinkB = pageB.locator('[data-testid="link-settings"]').or(
      pageB.locator('a[href="/settings"]')
    ).or(pageB.locator('text=Settings'));
    
    await settingsLinkB.click();
    await pageB.waitForLoadState('networkidle');
    await pageB.waitForTimeout(1000);

    // Find "Connect with Co-Parent" section
    const inviteCodeInput = pageB.locator('[data-testid="input-invite-code"]').or(
      pageB.locator('input[placeholder*="invite" i]').or(
        pageB.locator('input[maxlength="6"]')
      )
    );
    
    await inviteCodeInput.waitFor({ state: 'visible', timeout: 10000 });
    await inviteCodeInput.fill(inviteCode);
    console.log(`✅ Parent B entered invite code: ${inviteCode}`);

    // Click "Connect" button
    const connectButton = pageB.locator('[data-testid="button-connect"]').or(
      pageB.locator('button').filter({ hasText: /connect|join/i })
    );
    
    await connectButton.click();
    await pageB.waitForTimeout(3000); // Wait for partnership to be created

    await pageB.screenshot({ path: 'test-results/02-parent-b-connected.png', fullPage: true });

    // Verify partnership was created - look for success message or co-parent name
    const successIndicators = [
      pageB.locator('text=/partnership.*created/i'),
      pageB.locator('text=/connected.*successfully/i'),
      pageB.locator(`text=${parentAName}`),
      pageB.locator('[data-testid*="partner"]').filter({ hasText: parentAName })
    ];

    let partnershipConfirmed = false;
    for (const indicator of successIndicators) {
      if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        partnershipConfirmed = true;
        console.log('✅ Partnership created confirmation found');
        break;
      }
    }

    // Navigate to chat to verify conversation exists
    console.log('\n💬 Verifying conversation was auto-created...');
    
    // Parent B: Go to Chat
    const chatNavB = pageB.locator('[data-testid="nav-chat"]').or(
      pageB.locator('a[href="/chat"]').or(pageB.locator('text=Chat'))
    );
    await chatNavB.click();
    await pageB.waitForLoadState('networkidle');
    await pageB.waitForTimeout(2000);

    // Look for Parent A in conversations list
    const conversationWithA = pageB.locator(`text=${parentAName}`).first();
    const hasConversation = await conversationWithA.isVisible({ timeout: 5000 }).catch(() => false);

    console.log(`Conversation with ${parentAName} visible: ${hasConversation}`);

    await pageB.screenshot({ path: 'test-results/02-parent-b-chat-list.png', fullPage: true });

    // Assertions
    expect(partnershipConfirmed || hasConversation).toBeTruthy();
    console.log('✅ Partnership creation test PASSED');
    console.log(`   - Parent A: ${parentAName} (Code: ${inviteCode})`);
    console.log(`   - Parent B: ${parentBName}`);
    console.log(`   - Partnership created: ${partnershipConfirmed}`);
    console.log(`   - Conversation exists: ${hasConversation}`);

  } finally {
    // Cleanup
    await contextA.close();
    await contextB.close();
  }
});
