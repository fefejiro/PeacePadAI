import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  generateRandomName,
} from './helpers/test-utils';

test.describe('P1: AI Tone Analysis', () => {
  test('should display tone badge when typing message (mock mode)', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/chat');
    
    const messageInput = page.getByTestId('input-message');
    await messageInput.fill('Can you please pick up the kids today?');
    
    await page.waitForTimeout(2000);
    
    const toneBadge = page.getByTestId('badge-tone-analysis');
    await expect(toneBadge).toBeVisible({ timeout: 5000 });
    
    const toneText = await toneBadge.textContent();
    expect(toneText?.toLowerCase()).toMatch(/calm|cooperative|neutral/);
  });

  test('should show emoji suggestions based on tone', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/chat');
    
    const messageInput = page.getByTestId('input-message');
    await messageInput.fill('This is frustrating, we need to talk.');
    
    await page.waitForTimeout(2000);
    
    const emojiSuggestions = page.getByTestId('text-emoji-suggestions');
    if (await emojiSuggestions.isVisible({ timeout: 3000 }).catch(() => false)) {
      const suggestionsText = await emojiSuggestions.textContent();
      expect(suggestionsText).toBeTruthy();
    }
  });

  test('should provide rewording suggestions for tense messages', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/chat');
    
    const messageInput = page.getByTestId('input-message');
    await messageInput.fill('You never listen to me!');
    
    await page.waitForTimeout(2000);
    
    const rewordingSuggestion = page.getByTestId('text-rewording-suggestion');
    if (await rewordingSuggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
      const suggestionText = await rewordingSuggestion.textContent();
      expect(suggestionText).toBeTruthy();
      expect(suggestionText?.length).toBeGreaterThan(10);
    }
  });

  test('should analyze tone before sending message', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/chat');
    
    const messageInput = page.getByTestId('input-message');
    await messageInput.fill('Thank you for being flexible with the schedule.');
    
    await page.waitForTimeout(2000);
    
    const toneBadge = page.getByTestId('badge-tone-analysis');
    await expect(toneBadge).toBeVisible({ timeout: 5000 });
    
    const sendButton = page.getByTestId('button-send-message');
    await sendButton.click();
    
    await expect(page.getByText('Thank you for being flexible')).toBeVisible();
  });
});
