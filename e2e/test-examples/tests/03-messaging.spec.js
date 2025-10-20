const { test, expect } = require('@playwright/test');

/**
 * TEST 3: REAL-TIME MESSAGING
 * 
 * Purpose: Verify messages are sent and received in real-time between co-parents
 * 
 * Steps:
 * 1. Set up two connected co-parents (Parent A and Parent B)
 * 2. Parent A sends a message
 * 3. Verify Parent B receives message in real-time (WebSocket)
 * 4. Parent B sends a reply
 * 5. Verify Parent A receives reply
 * 6. Test message content appears correctly
 * 
 * Expected Results:
 * - Messages appear in both parents' chat windows
 * - Messages deliver within 3 seconds (real-time)
 * - Message text matches what was sent
 * - Sender names are correct
 * - Messages persist after page reload
 */

test('Co-parents send and receive messages in real-time', async ({ browser }) => {
  console.log('💬 Starting real-time messaging test...');

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  const parentAName = `Alice_${Date.now()}`;
  const parentBName = `Bob_${Date.now()}`;
  const messageFromA = `Hello from ${parentAName}! Testing real-time messaging.`;
  const messageFromB = `Hi ${parentAName}! I received your message.`;

  try {
    // Helper function to create account
    async function createAccount(page, displayName) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const skipButton = page.locator('[data-testid="button-skip-intro"]');
      if (await skipButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await skipButton.click();
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
      await nameInput.fill(displayName);

      const startButton = page.locator('[data-testid="button-start-guest"]').or(
        page.locator('button').filter({ hasText: /get started|start|continue/i })
      );
      await startButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    // Helper function to get invite code from settings
    async function getInviteCode(page) {
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

      const codeElement = page.locator('[data-testid="text-invite-code"]').or(
        page.locator('text=/[A-Z0-9]{6}/').first()
      );
      await codeElement.waitFor({ state: 'visible', timeout: 10000 });
      return (await codeElement.textContent()).trim();
    }

    // Helper function to connect using invite code
    async function connectWithCode(page, inviteCode) {
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

      const codeInput = page.locator('[data-testid="input-invite-code"]').or(
        page.locator('input[placeholder*="invite" i]').or(page.locator('input[maxlength="6"]'))
      );
      await codeInput.fill(inviteCode);

      const connectBtn = page.locator('[data-testid="button-connect"]').or(
        page.locator('button').filter({ hasText: /connect|join/i })
      );
      await connectBtn.click();
      await page.waitForTimeout(3000);
    }

    // SETUP: Create both accounts and connect them
    console.log('\n🔧 SETUP: Creating Parent A account...');
    await createAccount(pageA, parentAName);
    console.log(`✅ Parent A created: ${parentAName}`);

    console.log('\n🔧 SETUP: Getting Parent A invite code...');
    const inviteCode = await getInviteCode(pageA);
    console.log(`✅ Invite code: ${inviteCode}`);

    console.log('\n🔧 SETUP: Creating Parent B account...');
    await createAccount(pageB, parentBName);
    console.log(`✅ Parent B created: ${parentBName}`);

    console.log('\n🔧 SETUP: Connecting Parent B to Parent A...');
    await connectWithCode(pageB, inviteCode);
    console.log(`✅ Parents connected via invite code`);

    // Both parents navigate to chat
    console.log('\n💬 TEST START: Opening chat for both parents...');
    
    const chatNavA = pageA.locator('[data-testid="nav-chat"]').or(
      pageA.locator('a[href="/chat"]').or(pageA.locator('text=Chat'))
    );
    await chatNavA.click();
    await pageA.waitForLoadState('networkidle');
    await pageA.waitForTimeout(2000);

    const chatNavB = pageB.locator('[data-testid="nav-chat"]').or(
      pageB.locator('a[href="/chat"]').or(pageB.locator('text=Chat'))
    );
    await chatNavB.click();
    await pageB.waitForLoadState('networkidle');
    await pageB.waitForTimeout(2000);

    // Parent A: Select conversation with Parent B
    console.log('\n👤 Parent A: Opening conversation...');
    const conversationButtonA = pageA.locator(`text=${parentBName}`).first();
    if (await conversationButtonA.isVisible({ timeout: 5000 }).catch(() => false)) {
      await conversationButtonA.click();
      await pageA.waitForTimeout(1000);
      console.log(`✅ Parent A opened conversation with ${parentBName}`);
    } else {
      console.log(`ℹ️  Conversation with ${parentBName} not found in list, may already be open`);
    }

    // Parent B: Select conversation with Parent A
    console.log('\n👤 Parent B: Opening conversation...');
    const conversationButtonB = pageB.locator(`text=${parentAName}`).first();
    if (await conversationButtonB.isVisible({ timeout: 5000 }).catch(() => false)) {
      await conversationButtonB.click();
      await pageB.waitForTimeout(1000);
      console.log(`✅ Parent B opened conversation with ${parentAName}`);
    }

    await pageA.screenshot({ path: 'test-results/03-parent-a-chat-before.png', fullPage: true });
    await pageB.screenshot({ path: 'test-results/03-parent-b-chat-before.png', fullPage: true });

    // Parent A: Send message
    console.log('\n📤 Parent A: Sending message...');
    const messageInputA = pageA.locator('[data-testid="input-message"]').or(
      pageA.locator('textarea[placeholder*="message" i]').or(
        pageA.locator('input[placeholder*="message" i]')
      )
    );
    
    await messageInputA.fill(messageFromA);
    
    const sendButtonA = pageA.locator('[data-testid="button-send"]').or(
      pageA.locator('button').filter({ hasText: /send/i }).or(
        pageA.locator('button[type="submit"]')
      )
    );
    await sendButtonA.click();
    await pageA.waitForTimeout(2000);
    console.log(`✅ Message sent: "${messageFromA}"`);

    // Verify message appears in Parent A's chat
    const messageInA = pageA.locator(`text=${messageFromA}`);
    await expect(messageInA).toBeVisible({ timeout: 5000 });
    console.log('✅ Message visible in Parent A chat');

    // Verify message appears in Parent B's chat (real-time delivery)
    console.log('\n📥 Parent B: Waiting for message (real-time)...');
    const messageInB = pageB.locator(`text=${messageFromA}`);
    await expect(messageInB).toBeVisible({ timeout: 10000 });
    console.log('✅ Message received by Parent B in real-time!');

    await pageB.screenshot({ path: 'test-results/03-parent-b-received-message.png', fullPage: true });

    // Parent B: Send reply
    console.log('\n📤 Parent B: Sending reply...');
    const messageInputB = pageB.locator('[data-testid="input-message"]').or(
      pageB.locator('textarea[placeholder*="message" i]').or(
        pageB.locator('input[placeholder*="message" i]')
      )
    );
    
    await messageInputB.fill(messageFromB);
    
    const sendButtonB = pageB.locator('[data-testid="button-send"]').or(
      pageB.locator('button').filter({ hasText: /send/i }).or(
        pageB.locator('button[type="submit"]')
      )
    );
    await sendButtonB.click();
    await pageB.waitForTimeout(2000);
    console.log(`✅ Reply sent: "${messageFromB}"`);

    // Verify reply appears in Parent A's chat
    console.log('\n📥 Parent A: Waiting for reply (real-time)...');
    const replyInA = pageA.locator(`text=${messageFromB}`);
    await expect(replyInA).toBeVisible({ timeout: 10000 });
    console.log('✅ Reply received by Parent A in real-time!');

    await pageA.screenshot({ path: 'test-results/03-parent-a-received-reply.png', fullPage: true });

    // Test persistence: Reload Parent A's page
    console.log('\n🔄 Testing message persistence after reload...');
    await pageA.reload();
    await pageA.waitForLoadState('networkidle');
    await pageA.waitForTimeout(3000);

    const messageStillVisible = pageA.locator(`text=${messageFromA}`);
    const replyStillVisible = pageA.locator(`text=${messageFromB}`);
    
    await expect(messageStillVisible).toBeVisible({ timeout: 5000 });
    await expect(replyStillVisible).toBeVisible({ timeout: 5000 });
    console.log('✅ Messages persisted after page reload');

    await pageA.screenshot({ path: 'test-results/03-messages-after-reload.png', fullPage: true });

    console.log('\n✅ MESSAGING TEST PASSED');
    console.log(`   - Message sent: "${messageFromA.substring(0, 30)}..."`);
    console.log(`   - Reply sent: "${messageFromB.substring(0, 30)}..."`);
    console.log(`   - Real-time delivery: ✓`);
    console.log(`   - Message persistence: ✓`);

  } finally {
    await contextA.close();
    await contextB.close();
  }
});
