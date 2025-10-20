# 🚀 PeacePad E2E Tests - Quick Start Guide

## ⚡ Get Running in 3 Steps

### Step 1: Copy Files to Your Windows Laptop

Download or copy the entire `e2e/test-examples/` folder to your Windows machine at:

```
C:\Users\mikef\PeacePadAI\e2e\peacepad-tests\
```

Your folder should contain:
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
├── README.md
└── QUICK_START.md (this file)
```

### Step 2: Install Dependencies

Open **Command Prompt** (or PowerShell) and run:

```bash
cd C:\Users\mikef\PeacePadAI\e2e\peacepad-tests
npm install
npx playwright install
```

This downloads Playwright and the test browsers (takes 2-3 minutes).

### Step 3: Run Tests

```bash
npx playwright test --headed
```

Watch the tests run in a visible browser window! 🎉

---

## 📊 What Each Test Does

| Test | Duration | What It Tests |
|------|----------|---------------|
| **01-onboarding** | 10-15s | Skips carousel, accepts Terms of Service, creates guest account |
| **02-partnership** | 25-30s | Two parents connect using invite code |
| **03-messaging** | 30-35s | Real-time chat between connected parents |
| **04-settings** | 15-20s | Updates save and persist after reload |
| **05-custody** | 25-30s | Custody schedule builder and calendar colors |
| **06-responsive** | 20-25s | Mobile bottom nav vs desktop sidebar |

**Total Runtime:** ~2-3 minutes for all 6 tests

---

## 🎯 Common Commands

```bash
# Run all tests (headless - no visible browser)
npx playwright test

# Run with visible browser (RECOMMENDED FIRST TIME)
npx playwright test --headed

# Run one specific test
npx playwright test 01-onboarding

# Debug mode (step through each action)
npx playwright test --debug

# Interactive UI mode
npx playwright test --ui

# View HTML report after tests finish
npx playwright show-report
```

---

## 🐛 Troubleshooting

### ❌ "node is not recognized"
**Fix:** Close all Command Prompt windows and open a new one. If still broken, restart your computer.

### ❌ Tests timeout or can't connect
**Fix:** 
1. Open browser and go to: https://peace-pad-ai-2rqkkxbq5g.replit.app
2. If app doesn't load, update the URL in `playwright.config.js`:
   ```javascript
   baseURL: 'https://your-new-url-here.replit.app',
   ```

### ❌ Tests fail on first run
**Fix:** This is normal! Run again:
```bash
npx playwright test --headed
```
Sometimes the app needs a moment to wake up from sleep.

### ❌ Tests fail on consent screen
**Fix:** The onboarding flow now requires accepting Terms of Service:
1. Welcome carousel (Skip Intro button)
2. **Terms of Service** (scroll to bottom → check checkbox → click continue)
3. Guest entry form (display name)

All tests have been updated to handle this flow automatically.

---

## 📸 Screenshots & Videos

After tests run, check `test-results/` folder for:
- **Screenshots** - Captured at key moments and on failures
- **Videos** - Full recordings of failed tests
- **Traces** - Detailed timeline of every action (open with `npx playwright show-trace`)

---

## ✅ What Success Looks Like

When tests pass, you'll see:
```
Running 6 tests using 1 worker

  ✓  tests/01-onboarding.spec.js:19:1 › Complete onboarding flow (12s)
  ✓  tests/02-partnership-creation.spec.js:25:1 › Two co-parents connect (28s)
  ✓  tests/03-messaging.spec.js:32:1 › Real-time messaging (31s)
  ✓  tests/04-settings-persistence.spec.js:27:1 › Settings persistence (17s)
  ✓  tests/05-custody-schedule.spec.js:30:1 › Custody schedule setup (26s)
  ✓  tests/06-responsive-navigation.spec.js:22:1 › Mobile navigation (15s)

  6 passed (2m 9s)
```

Then run:
```bash
npx playwright show-report
```

This opens a beautiful HTML report in your browser showing:
- ✅ Which tests passed
- ⏱️ How long each took
- 📸 Screenshots at each step
- 🎥 Videos of the test runs

---

## 🎉 Next Steps

1. **Run tests regularly** - Catch bugs early
2. **Run before deploying** - Make sure nothing broke
3. **Customize tests** - Add your own test cases
4. **Share results** - Send HTML report to team

---

**Need more help?** See the full `README.md` for detailed documentation.

**Happy Testing!** 🚀
