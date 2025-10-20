# PeacePad E2E Test Suite

Comprehensive end-to-end tests for PeacePad using Playwright.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Coverage](#test-coverage)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running Tests](#running-tests)
- [Test Results](#test-results)
- [Troubleshooting](#troubleshooting)
- [Writing New Tests](#writing-new-tests)

## 🎯 Overview

This test suite validates PeacePad's core functionality including:
- User onboarding
- Partnership creation via invite codes
- Real-time messaging
- Settings persistence
- Custody schedule management
- Responsive navigation

## 📊 Test Coverage

### Test 1: Onboarding Flow (`01-onboarding.spec.js`)
- ✅ Welcome carousel display and skip functionality
- ✅ Guest account creation with display name
- ✅ Emoji profile picture selection
- ✅ Navigation to home page after onboarding

**Expected Duration:** 10-15 seconds

### Test 2: Partnership Creation (`02-partnership-creation.spec.js`)
- ✅ Generate unique invite code for Parent A
- ✅ Parent B joins using invite code
- ✅ Partnership creation confirmation
- ✅ Automatic conversation creation between co-parents
- ✅ Both parents see each other in chat list

**Expected Duration:** 25-30 seconds

### Test 3: Real-Time Messaging (`03-messaging.spec.js`)
- ✅ Parent A sends message to Parent B
- ✅ Message delivers in real-time via WebSocket
- ✅ Parent B receives message within 3 seconds
- ✅ Reply functionality works in both directions
- ✅ Messages persist after page reload

**Expected Duration:** 30-35 seconds

### Test 4: Settings Persistence (`04-settings-persistence.spec.js`)
- ✅ Display name can be updated
- ✅ Phone number can be added
- ✅ Save button triggers update
- ✅ Success message appears
- ✅ Changes persist after page reload
- ✅ UseEffect syncs input fields correctly

**Expected Duration:** 15-20 seconds

### Test 5: Custody Schedule (`05-custody-schedule.spec.js`)
- ✅ Custody schedule builder opens
- ✅ Pattern selection (Week on/Week off, 2-2-3, etc.)
- ✅ Start date configuration
- ✅ Parent color assignment
- ✅ Calendar shows color-coded custody days
- ✅ Schedule persists across sessions

**Expected Duration:** 25-30 seconds

### Test 6: Responsive Navigation (`06-responsive-navigation.spec.js`)
- ✅ Mobile view (<768px) shows bottom navigation
- ✅ Desktop view (≥768px) shows sidebar
- ✅ All navigation links work in both modes
- ✅ Navigation adapts when resizing viewport
- ✅ Sidebar toggle functionality (if applicable)

**Expected Duration:** 20-25 seconds

---

## 🔧 Prerequisites

### System Requirements
- **Windows 10+** (or macOS/Linux)
- **Node.js 18+** (LTS recommended)
- **npm 8+**

### Check Your Installation
```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show 8.x.x or higher
```

---

## 📥 Installation

### Step 1: Copy Test Files

Copy all files from this folder to your Windows machine:

```
C:\Users\YourName\PeacePadAI\e2e\peacepad-tests\
```

Your folder structure should look like:
```
peacepad-tests/
├── tests/
│   ├── 01-onboarding.spec.js
│   ├── 02-partnership-creation.spec.js
│   ├── 03-messaging.spec.js
│   ├── 04-settings-persistence.spec.js
│   ├── 05-custody-schedule.spec.js
│   └── 06-responsive-navigation.spec.js
├── playwright.config.js
├── package.json
└── README.md (this file)
```

### Step 2: Install Playwright

Open Command Prompt or PowerShell and navigate to your test folder:

```bash
cd C:\Users\YourName\PeacePadAI\e2e\peacepad-tests
npm init playwright@latest
```

When prompted:
- **TypeScript or JavaScript?** Choose **JavaScript**
- **Test folder?** Press Enter (uses `tests`)
- **Add GitHub Actions?** Type **n**
- **Install browsers?** Type **y**

This will download Chromium, Firefox, and WebKit browsers.

### Step 3: Verify Installation

```bash
npx playwright --version
```

You should see something like: `Version 1.48.0`

---

## 🚀 Running Tests

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test
```bash
npx playwright test 01-onboarding.spec.js
```

### Run Tests with Visible Browser (Headed Mode)
```bash
npx playwright test --headed
```

**Recommended for first run** - You can see exactly what's happening!

### Run Tests in Debug Mode
```bash
npx playwright test --debug
```

Steps through each test action, allowing you to inspect the page.

### Run Tests in UI Mode (Interactive)
```bash
npx playwright test --ui
```

Opens an interactive UI where you can:
- Pick which tests to run
- See results in real-time
- Inspect screenshots and videos

### Run Only Failed Tests
```bash
npx playwright test --last-failed
```

### Run Tests on Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

---

## 📊 Test Results

### View HTML Report
After tests complete:

```bash
npx playwright show-report
```

This opens an interactive HTML report showing:
- ✅ Pass/Fail status for each test
- ⏱️ Execution time
- 📸 Screenshots on failure
- 🎥 Videos of test runs
- 📜 Detailed logs

### Results Location
- **HTML Report:** `test-results/html-report/index.html`
- **Screenshots:** `test-results/*.png`
- **Videos:** `test-results/*.webm`
- **Traces:** `test-results/*.zip`

### View Trace Files
For failed tests with traces:

```bash
npx playwright show-trace test-results/trace.zip
```

Shows a detailed timeline of:
- Every action taken
- Network requests
- Console logs
- Screenshots at each step

---

## 🐛 Troubleshooting

### Issue: "node is not recognized"
**Solution:** Node.js is not in your PATH.
1. Close all Command Prompt windows
2. Open a new Command Prompt
3. If still not working, restart your computer

### Issue: Tests timeout or fail to connect
**Solution:** Check your internet connection and Replit app status.
1. Open browser and visit: `https://peace-pad-ai-2rqkkxbq5g.replit.app`
2. Verify the app loads
3. If "Not Found", the app may be sleeping or URL changed
4. Update `baseURL` in `playwright.config.js`

### Issue: "Cannot find module '@playwright/test'"
**Solution:** Playwright not installed correctly.
```bash
npm install @playwright/test@latest
npx playwright install
```

### Issue: Tests fail on "Skip Intro"
**Solution:** Your app might have skipped the welcome carousel.
- This is normal if you've already completed onboarding
- The tests handle this with `.catch(() => false)`
- Tests will continue to guest entry form

### Issue: Partnership tests fail
**Solution:** Tests might be creating duplicate partnerships.
- Clear your browser cookies: `npx playwright test --workers=1`
- Or use isolated browser contexts (already configured)

### Issue: Screenshots not saving
**Solution:** Create the results folder manually:
```bash
mkdir test-results
```

### Issue: "SyntaxError" in test files
**Solution:** Make sure you're using JavaScript syntax, not TypeScript.
- Files should end with `.js` not `.ts`
- Use `const` and `require()`, not `import`

---

## 📝 Writing New Tests

### Basic Test Structure

```javascript
const { test, expect } = require('@playwright/test');

test('My new test', async ({ page }) => {
  // 1. Navigate to page
  await page.goto('/');
  
  // 2. Interact with elements
  await page.fill('[data-testid="input-name"]', 'Test User');
  await page.click('[data-testid="button-submit"]');
  
  // 3. Verify results
  await expect(page.locator('text=Success')).toBeVisible();
  
  // 4. Take screenshot
  await page.screenshot({ path: 'test-results/my-test.png' });
});
```

### Best Practices

1. **Use data-testid attributes** - Most reliable selector
   ```javascript
   page.locator('[data-testid="button-save"]')
   ```

2. **Wait for elements** - Don't rush
   ```javascript
   await element.waitFor({ state: 'visible', timeout: 5000 });
   ```

3. **Use flexible selectors** - Provide fallbacks
   ```javascript
   const button = page.locator('[data-testid="save"]').or(
     page.locator('button').filter({ hasText: /save/i })
   );
   ```

4. **Add console logs** - Makes debugging easier
   ```javascript
   console.log('✅ Step completed successfully');
   ```

5. **Take screenshots** - Capture state at key moments
   ```javascript
   await page.screenshot({ path: 'test-results/step-name.png', fullPage: true });
   ```

6. **Handle timing** - Allow time for animations/loading
   ```javascript
   await page.waitForLoadState('networkidle');
   await page.waitForTimeout(1000);
   ```

### Common Patterns

**Creating Multiple Users:**
```javascript
test('Multi-user test', async ({ browser }) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  
  // Now you have two separate users
  
  // Cleanup
  await contextA.close();
  await contextB.close();
});
```

**Testing Responsive Design:**
```javascript
await page.setViewportSize({ width: 375, height: 667 }); // Mobile
await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
```

**Waiting for Real-time Updates:**
```javascript
// Wait for WebSocket message to arrive
await expect(page.locator('text=New message')).toBeVisible({ timeout: 10000 });
```

---

## 📚 Additional Resources

- **Playwright Docs:** https://playwright.dev
- **PeacePad GitHub:** https://github.com/yourrepo/peacepad
- **Replit Docs:** https://docs.replit.com

---

## ✅ Quick Reference

### Common Commands
```bash
# Run all tests
npx playwright test

# Run with visible browser
npx playwright test --headed

# Run specific test
npx playwright test 01-onboarding

# Debug mode
npx playwright test --debug

# View report
npx playwright show-report

# Update browsers
npx playwright install
```

### Test File Naming
- Use descriptive names: `feature-description.spec.js`
- Number tests in execution order: `01-`, `02-`, `03-`
- Use lowercase with hyphens: `custody-schedule.spec.js`

### Screenshot Naming
- Be descriptive: `05-custody-after-save.png`
- Use test number prefix: `03-parent-a-chat-before.png`
- Indicate state: `before`, `after`, `error`, `success`

---

## 🎉 Success Checklist

- [ ] Node.js installed and in PATH
- [ ] Playwright installed (`npx playwright --version` works)
- [ ] All 6 test files copied to `tests/` folder
- [ ] `playwright.config.js` has correct `baseURL`
- [ ] Ran `npx playwright test --headed` successfully
- [ ] Viewed HTML report with `npx playwright show-report`
- [ ] Screenshots saved to `test-results/` folder

**You're all set!** Happy testing! 🚀

---

**Questions or Issues?**
Check the [Troubleshooting](#troubleshooting) section or refer to the [Playwright Documentation](https://playwright.dev/docs/intro).
