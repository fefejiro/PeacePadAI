import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  joinPartnership,
  sendMessage,
  waitForMessage,
  generateRandomName,
} from './helpers/test-utils';

test.describe('P0: Real-Time Chat', () => {
  test('should send and receive messages in real-time between co-parents', async ({ browser }) => {
    const parentAName = generateRandomName();
    const parentBName = generateRandomName();
    const messageText = `Hello from Parent A - ${Date.now()}`;
    
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    await pageA.goto('/');
    const inviteCodeA = await completeOnboarding(pageA, parentAName);
    
    await pageB.goto('/');
    await completeOnboarding(pageB, parentBName);
    await joinPartnership(pageB, inviteCodeA);
    
    await pageA.goto('/chat');
    await pageB.goto('/chat');
    
    await pageA.waitForTimeout(1000);
    await pageB.waitForTimeout(1000);
    
    await sendMessage(pageA, messageText);
    
    await waitForMessage(pageB, messageText, 15000);
    
    await expect(pageB.getByText(messageText)).toBeVisible();
    
    await contextA.close();
    await contextB.close();
  });

  test('should display message timestamps', async ({ browser }) => {
    const parentAName = generateRandomName();
    const parentBName = generateRandomName();
    const messageText = `Timestamped message - ${Date.now()}`;
    
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    await pageA.goto('/');
    const inviteCodeA = await completeOnboarding(pageA, parentAName);
    
    await pageB.goto('/');
    await completeOnboarding(pageB, parentBName);
    await joinPartnership(pageB, inviteCodeA);
    
    await pageA.goto('/chat');
    
    await sendMessage(pageA, messageText);
    
    const messageElement = pageA.locator(`text=${messageText}`).locator('..').locator('[data-testid*="timestamp"]');
    await expect(messageElement).toBeVisible({ timeout: 5000 });
    
    await contextA.close();
    await contextB.close();
  });

  test('should show typing indicator when co-parent is typing', async ({ browser }) => {
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
    
    await pageA.goto('/chat');
    await pageB.goto('/chat');
    
    await pageA.waitForTimeout(1000);
    
    const messageInput = pageA.getByTestId('input-message');
    await messageInput.fill('Typing...');
    
    const typingIndicator = pageB.getByTestId('text-typing-indicator');
    await expect(typingIndicator).toBeVisible({ timeout: 5000 });
    
    await contextA.close();
    await contextB.close();
  });

  test('should support bidirectional messaging', async ({ browser }) => {
    const parentAName = generateRandomName();
    const parentBName = generateRandomName();
    const messageFromA = `Message from A - ${Date.now()}`;
    const messageFromB = `Message from B - ${Date.now()}`;
    
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    await pageA.goto('/');
    const inviteCodeA = await completeOnboarding(pageA, parentAName);
    
    await pageB.goto('/');
    await completeOnboarding(pageB, parentBName);
    await joinPartnership(pageB, inviteCodeA);
    
    await pageA.goto('/chat');
    await pageB.goto('/chat');
    
    await sendMessage(pageA, messageFromA);
    await waitForMessage(pageB, messageFromA);
    
    await sendMessage(pageB, messageFromB);
    await waitForMessage(pageA, messageFromB);
    
    await expect(pageA.getByText(messageFromB)).toBeVisible();
    await expect(pageB.getByText(messageFromA)).toBeVisible();
    
    await contextA.close();
    await contextB.close();
  });
});
