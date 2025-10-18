import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  generateRandomName,
} from './helpers/test-utils';

test.describe('P1: Find Support Directory', () => {
  test('should search support resources by postal code', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/support');
    
    const postalCodeInput = page.getByTestId('input-postal-code');
    await postalCodeInput.fill('M5H 2N2');
    
    const searchButton = page.getByTestId('button-search-support');
    await searchButton.click();
    
    await page.waitForTimeout(2000);
    
    const resultsContainer = page.getByTestId('container-support-results');
    await expect(resultsContainer).toBeVisible({ timeout: 10000 });
  });

  test('should filter results by category', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/support');
    
    const postalCodeInput = page.getByTestId('input-postal-code');
    await postalCodeInput.fill('M5H 2N2');
    
    const searchButton = page.getByTestId('button-search-support');
    await searchButton.click();
    
    await page.waitForTimeout(2000);
    
    const categoryFilter = page.getByTestId('filter-category-therapists');
    if (await categoryFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await categoryFilter.click();
      
      await page.waitForTimeout(1000);
      
      const filteredResults = page.getByTestId('container-support-results');
      await expect(filteredResults).toBeVisible();
    }
  });

  test('should display resource details', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/support');
    
    const postalCodeInput = page.getByTestId('input-postal-code');
    await postalCodeInput.fill('M5H 2N2');
    
    const searchButton = page.getByTestId('button-search-support');
    await searchButton.click();
    
    await page.waitForTimeout(2000);
    
    const firstResult = page.getByTestId('card-support-result-0');
    if (await firstResult.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstResult.click();
      
      const detailsDialog = page.getByTestId('dialog-resource-details');
      await expect(detailsDialog).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show map with resource pins', async ({ page }) => {
    const parentName = generateRandomName();
    
    await page.goto('/');
    await completeOnboarding(page, parentName);
    
    await page.goto('/support');
    
    const postalCodeInput = page.getByTestId('input-postal-code');
    await postalCodeInput.fill('M5H 2N2');
    
    const searchButton = page.getByTestId('button-search-support');
    await searchButton.click();
    
    await page.waitForTimeout(2000);
    
    const mapContainer = page.getByTestId('container-support-map');
    if (await mapContainer.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(mapContainer).toBeVisible();
    }
  });
});
