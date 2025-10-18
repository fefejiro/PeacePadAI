import { test, expect } from '@playwright/test';
import {
  completeOnboarding,
  joinPartnership,
  createTask,
  waitForTask,
  createNote,
  generateRandomName,
} from './helpers/test-utils';

test.describe('P0: Shared Data Visibility', () => {
  test('should share tasks between partnered co-parents', async ({ browser }) => {
    const parentAName = generateRandomName();
    const parentBName = generateRandomName();
    const taskTitle = `Task ${Date.now()}`;
    
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    await pageA.goto('/');
    const inviteCodeA = await completeOnboarding(pageA, parentAName);
    
    await pageB.goto('/');
    await completeOnboarding(pageB, parentBName);
    await joinPartnership(pageB, inviteCodeA);
    
    await createTask(pageA, taskTitle);
    
    await waitForTask(pageB, taskTitle);
    
    await expect(pageB.getByText(taskTitle)).toBeVisible();
    
    await contextA.close();
    await contextB.close();
  });

  test('should share notes between partnered co-parents', async ({ browser }) => {
    const parentAName = generateRandomName();
    const parentBName = generateRandomName();
    const noteTitle = `Note ${Date.now()}`;
    const noteContent = 'This is a shared note for co-parenting.';
    
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    await pageA.goto('/');
    const inviteCodeA = await completeOnboarding(pageA, parentAName);
    
    await pageB.goto('/');
    await completeOnboarding(pageB, parentBName);
    await joinPartnership(pageB, inviteCodeA);
    
    await createNote(pageA, noteTitle, noteContent);
    
    await pageB.goto('/notes');
    await expect(pageB.getByText(noteTitle)).toBeVisible({ timeout: 10000 });
    
    await contextA.close();
    await contextB.close();
  });

  test('should share child updates between partnered co-parents', async ({ browser }) => {
    const parentAName = generateRandomName();
    const parentBName = generateRandomName();
    const updateText = `School pickup at 3pm - ${Date.now()}`;
    
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    await pageA.goto('/');
    const inviteCodeA = await completeOnboarding(pageA, parentAName);
    
    await pageB.goto('/');
    await completeOnboarding(pageB, parentBName);
    await joinPartnership(pageB, inviteCodeA);
    
    await pageA.goto('/child-updates');
    
    const newUpdateButton = pageA.getByTestId('button-new-child-update');
    if (await newUpdateButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newUpdateButton.click();
      
      const updateInput = pageA.getByTestId('input-child-update');
      await updateInput.fill(updateText);
      
      const saveButton = pageA.getByTestId('button-save-child-update');
      await saveButton.click();
    }
    
    await pageB.goto('/child-updates');
    await expect(pageB.getByText(updateText)).toBeVisible({ timeout: 10000 });
    
    await contextA.close();
    await contextB.close();
  });

  test('should share expenses between partnered co-parents', async ({ browser }) => {
    const parentAName = generateRandomName();
    const parentBName = generateRandomName();
    const expenseDescription = `Childcare - ${Date.now()}`;
    const expenseAmount = '150.00';
    
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    await pageA.goto('/');
    const inviteCodeA = await completeOnboarding(pageA, parentAName);
    
    await pageB.goto('/');
    await completeOnboarding(pageB, parentBName);
    await joinPartnership(pageB, inviteCodeA);
    
    await pageA.goto('/expenses');
    
    const newExpenseButton = pageA.getByTestId('button-new-expense');
    if (await newExpenseButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newExpenseButton.click();
      
      const descriptionInput = pageA.getByTestId('input-expense-description');
      await descriptionInput.fill(expenseDescription);
      
      const amountInput = pageA.getByTestId('input-expense-amount');
      await amountInput.fill(expenseAmount);
      
      const saveButton = pageA.getByTestId('button-save-expense');
      await saveButton.click();
    }
    
    await pageB.goto('/expenses');
    await expect(pageB.getByText(expenseDescription)).toBeVisible({ timeout: 10000 });
    
    await contextA.close();
    await contextB.close();
  });

  test('should share calendar events between partnered co-parents', async ({ browser }) => {
    const parentAName = generateRandomName();
    const parentBName = generateRandomName();
    const eventTitle = `Pickup - ${Date.now()}`;
    
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    await pageA.goto('/');
    const inviteCodeA = await completeOnboarding(pageA, parentAName);
    
    await pageB.goto('/');
    await completeOnboarding(pageB, parentBName);
    await joinPartnership(pageB, inviteCodeA);
    
    await pageA.goto('/calendar');
    
    const newEventButton = pageA.getByTestId('button-new-event');
    if (await newEventButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newEventButton.click();
      
      const titleInput = pageA.getByTestId('input-event-title');
      await titleInput.fill(eventTitle);
      
      const saveButton = pageA.getByTestId('button-save-event');
      await saveButton.click();
    }
    
    await pageB.goto('/calendar');
    await expect(pageB.getByText(eventTitle)).toBeVisible({ timeout: 10000 });
    
    await contextA.close();
    await contextB.close();
  });

  test('should share pets between partnered co-parents', async ({ browser }) => {
    const parentAName = generateRandomName();
    const parentBName = generateRandomName();
    const petName = `Buddy${Date.now()}`;
    
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    
    await pageA.goto('/');
    const inviteCodeA = await completeOnboarding(pageA, parentAName);
    
    await pageB.goto('/');
    await completeOnboarding(pageB, parentBName);
    await joinPartnership(pageB, inviteCodeA);
    
    await pageA.goto('/pets');
    
    const newPetButton = pageA.getByTestId('button-new-pet');
    if (await newPetButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await newPetButton.click();
      
      const nameInput = pageA.getByTestId('input-pet-name');
      await nameInput.fill(petName);
      
      const saveButton = pageA.getByTestId('button-save-pet');
      await saveButton.click();
    }
    
    await pageB.goto('/pets');
    await expect(pageB.getByText(petName)).toBeVisible({ timeout: 10000 });
    
    await contextA.close();
    await contextB.close();
  });
});
