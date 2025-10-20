# Test Fixes Applied - Skip Intro Button Issue

## Problem Identified
The Playwright tests were failing when clicking the "Skip Intro" button because they were using a text-based locator (`text=Skip Intro`) which was less reliable than using the component's proper `data-testid` attribute.

## Solution Applied
Updated all 6 test files to use the more reliable `data-testid` selector:

### Changed From:
```javascript
const skipButton = page.locator('text=Skip Intro');
```

### Changed To:
```javascript
const skipButton = page.locator('[data-testid="button-skip-intro"]');
```

## Additional Improvements
1. **Increased wait time** after clicking Skip Intro from 1000ms to 1500ms for better stability
2. **Added console logging** to confirm when Skip Intro button is clicked
3. All wait conditions remain to ensure consent screen appears properly

## Files Updated
1. ✅ `01-onboarding.spec.js`
2. ✅ `02-partnership-creation.spec.js`
3. ✅ `03-messaging.spec.js`
4. ✅ `04-settings-persistence.spec.js`
5. ✅ `05-custody-schedule.spec.js`
6. ✅ `06-responsive-navigation.spec.js`

## Testing Instructions

### Run Single Test to Verify Fix
```bash
npx playwright test 01-onboarding.spec.js --headed
```

Watch for the console output:
- `📸 Welcome carousel detected, clicking Skip Intro...`
- `✅ Skip Intro clicked`
- `📋 Consent agreement detected, scrolling and accepting...`

### Run All Tests
```bash
npx playwright test --headed
```

## Expected Flow
1. **Page loads** → Welcome carousel appears
2. **Click Skip Intro** (using data-testid) → Carousel closes
3. **Wait 1.5 seconds** → Consent screen appears
4. **Scroll terms** → Checkbox becomes enabled
5. **Check checkbox** → Accept button becomes clickable
6. **Click Accept** → Navigate to /onboarding
7. **Fill display name** → Complete guest registration

## Troubleshooting

### If "Skip Intro" still doesn't work:
1. Check the button is actually visible in headed mode
2. Verify the `data-testid="button-skip-intro"` exists in the component
3. Try increasing the visibility timeout:
   ```javascript
   if (await skipButton.isVisible({ timeout: 5000 }).catch(() => false))
   ```

### If consent screen doesn't appear:
1. Check localStorage - if `hasSeenIntro` is set, clear it:
   ```javascript
   localStorage.removeItem('hasSeenIntro');
   localStorage.removeItem('hasAcceptedConsent');
   ```
2. Increase wait time after clicking Skip Intro to 2000ms

## Component Reference
The Skip Intro button in `LandingIntroSlideshow.tsx`:
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={handleSkip}
  className="absolute top-4 right-4 z-20 gap-2"
  data-testid="button-skip-intro"  // ← This is what we now target
>
  <X className="h-4 w-4" />
  Skip Intro
</Button>
```

## Next Steps
Run the tests on your Windows laptop and verify they pass:

```bash
cd C:\Users\mikef\PeacePadAI\e2e\peacepad-tests
npx playwright test --headed
```

All 6 tests should now complete successfully! 🎉
