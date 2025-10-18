import { Page, BrowserContext, expect } from '@playwright/test';

export interface TestUser {
  displayName: string;
  context: BrowserContext;
  page: Page;
  inviteCode?: string;
  userId?: string;
}

export async function createGuestUser(
  context: BrowserContext,
  displayName: string
): Promise<TestUser> {
  const page = await context.newPage();
  
  await page.goto('/');
  
  const user: TestUser = {
    displayName,
    context,
    page,
  };
  
  return user;
}

export async function completeOnboarding(
  page: Page,
  displayName: string,
  skipIntro: boolean = true
): Promise<string> {
  if (skipIntro) {
    const skipButton = page.getByTestId('button-skip-intro');
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
    }
  }
  
  await page.waitForURL(/\/onboarding|\/dashboard|\/chat/, { timeout: 10000 });
  
  const nameInput = page.getByTestId('input-display-name');
  if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await nameInput.fill(displayName);
    
    const continueButton = page.getByTestId('button-continue-onboarding');
    await continueButton.click();
    
    const skipOptionalButton = page.getByTestId('button-skip-optional');
    if (await skipOptionalButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipOptionalButton.click();
    }
    
    const finishButton = page.getByTestId('button-finish-onboarding');
    if (await finishButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await finishButton.click();
    }
  }
  
  await page.waitForURL(/\/dashboard|\/chat/, { timeout: 10000 });
  
  const inviteCodeElement = await page.getByTestId('text-invite-code').textContent();
  const inviteCode = inviteCodeElement?.trim() || '';
  
  return inviteCode;
}

export async function joinPartnership(
  page: Page,
  inviteCode: string
): Promise<void> {
  const addCoParentButton = page.getByTestId('button-add-coparent');
  await addCoParentButton.click();
  
  const inviteCodeInput = page.getByTestId('input-invite-code');
  await inviteCodeInput.fill(inviteCode);
  
  const joinButton = page.getByTestId('button-join-partnership');
  await joinButton.click();
  
  await expect(page.getByText(/partnership created|connected/i)).toBeVisible({ timeout: 5000 });
}

export async function sendMessage(
  page: Page,
  message: string
): Promise<void> {
  const messageInput = page.getByTestId('input-message');
  await messageInput.fill(message);
  
  const sendButton = page.getByTestId('button-send-message');
  await sendButton.click();
  
  await expect(page.getByText(message)).toBeVisible({ timeout: 5000 });
}

export async function waitForMessage(
  page: Page,
  message: string,
  timeout: number = 10000
): Promise<void> {
  await expect(page.getByText(message)).toBeVisible({ timeout });
}

export async function createTask(
  page: Page,
  taskTitle: string
): Promise<void> {
  await page.goto('/tasks');
  
  const newTaskButton = page.getByTestId('button-new-task');
  await newTaskButton.click();
  
  const taskTitleInput = page.getByTestId('input-task-title');
  await taskTitleInput.fill(taskTitle);
  
  const saveButton = page.getByTestId('button-save-task');
  await saveButton.click();
  
  await expect(page.getByText(taskTitle)).toBeVisible({ timeout: 5000 });
}

export async function waitForTask(
  page: Page,
  taskTitle: string,
  timeout: number = 10000
): Promise<void> {
  await page.goto('/tasks');
  await expect(page.getByText(taskTitle)).toBeVisible({ timeout });
}

export async function createNote(
  page: Page,
  noteTitle: string,
  noteContent: string
): Promise<void> {
  await page.goto('/notes');
  
  const newNoteButton = page.getByTestId('button-new-note');
  await newNoteButton.click();
  
  const noteTitleInput = page.getByTestId('input-note-title');
  await noteTitleInput.fill(noteTitle);
  
  const noteContentInput = page.getByTestId('input-note-content');
  await noteContentInput.fill(noteContent);
  
  const saveButton = page.getByTestId('button-save-note');
  await saveButton.click();
  
  await expect(page.getByText(noteTitle)).toBeVisible({ timeout: 5000 });
}

export async function getInviteCode(page: Page): Promise<string> {
  await page.goto('/settings');
  
  const inviteCodeElement = await page.getByTestId('text-invite-code').textContent();
  return inviteCodeElement?.trim() || '';
}

export function generateRandomName(): string {
  const adjectives = ['Happy', 'Calm', 'Bright', 'Kind', 'Gentle'];
  const nouns = ['Parent', 'Guardian', 'Caregiver', 'Mom', 'Dad'];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = Math.floor(Math.random() * 1000);
  return `${randomAdj}${randomNoun}${randomNum}`;
}

export async function waitForWebSocket(page: Page, timeout: number = 5000): Promise<void> {
  await page.waitForFunction(
    () => {
      const logs = (window as any).__websocket_logs || [];
      return logs.some((log: string) => log.includes('WebSocket connected'));
    },
    { timeout }
  ).catch(() => {
    console.log('WebSocket connection timeout - continuing anyway');
  });
}

export async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

export async function uploadProfilePhoto(
  page: Page,
  filePath: string
): Promise<void> {
  await page.goto('/settings');
  
  const uploadInput = page.getByTestId('input-profile-photo');
  await uploadInput.setInputFiles(filePath);
  
  await expect(page.getByTestId('img-profile-photo')).toBeVisible({ timeout: 5000 });
}
