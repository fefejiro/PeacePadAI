# E2E Test Setup Guide

## Quick Start

### 1. Install System Dependencies (First Time Only)

**On Replit/Linux:**
```bash
sudo npx playwright install-deps
```

**On macOS:**
```bash
# Dependencies should be automatically available
```

**On Windows:**
```bash
# Dependencies should be automatically available
```

### 2. Install Playwright Browsers
```bash
npx playwright install
```

### 3. Run Tests

**Run all tests:**
```bash
./run-tests.sh
```

**Run specific test suites:**
```bash
./run-tests.sh p0      # Critical tests
./run-tests.sh p1      # Important tests
./run-tests.sh p2      # Nice-to-have tests
./run-tests.sh nf      # Non-functional tests
```

**Interactive UI mode:**
```bash
./run-tests.sh ui
```

**See browser while testing:**
```bash
./run-tests.sh headed
```

**Debug mode:**
```bash
./run-tests.sh debug
```

## Test Summary

### ✅ What's Included

**13 Test Files** covering:
- ✓ Partnership creation & invite codes
- ✓ Real-time chat & messaging
- ✓ Shared data (tasks, notes, expenses, events, pets, child updates)
- ✓ AI tone analysis
- ✓ Video/audio calls
- ✓ Find support directory
- ✓ Settings & preferences
- ✓ Intro slideshow
- ✓ Accessibility (WCAG, keyboard nav, screen readers)
- ✓ Performance benchmarks
- ✓ PWA offline support
- ✓ Cross-browser compatibility

**50+ Individual Test Cases** validating critical user journeys

### 🎯 Critical Tests (P0)

These tests validate the **core value** of PeacePad:

1. **Partnership Flow** - Two parents connecting via invite codes
2. **Invite Code Persistence** - Codes don't regenerate (bug fix validation)
3. **Shared Data** - All 6 data types visible to both co-parents
4. **Real-Time Chat** - Messages, timestamps, typing indicators

### 📊 Test Coverage by Feature

| Feature | Tests | Priority |
|---------|-------|----------|
| Partnership Creation | 4 | P0 |
| Invite Code System | 3 | P0 |
| Shared Tasks | 1 | P0 |
| Shared Notes | 1 | P0 |
| Shared Child Updates | 1 | P0 |
| Shared Expenses | 1 | P0 |
| Shared Events | 1 | P0 |
| Shared Pets | 1 | P0 |
| Real-Time Chat | 4 | P0 |
| AI Tone Analysis | 4 | P1 |
| Call Joining | 4 | P1 |
| Find Support | 4 | P1 |
| Settings | 5 | P1 |
| Intro Slideshow | 5 | P2 |
| Accessibility | 6 | P2 |
| Performance | 7 | NF |

## Viewing Results

After running tests:

```bash
./run-tests.sh report
```

This opens an interactive HTML report showing:
- Pass/fail status for each test
- Screenshots of failures
- Video recordings
- Execution times
- Error stack traces

## CI/CD Integration

The tests are configured for CI environments with:
- Automatic retries (2x)
- Screenshot/video capture on failure
- Single worker for stability
- HTML report artifacts

### GitHub Actions Example

```yaml
- name: Install dependencies
  run: npm install

- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npx playwright test

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Tests fail with "Missing dependencies"
```bash
sudo npx playwright install-deps
```

### "Cannot find module" errors
```bash
npm install
```

### WebSocket timeout errors
- Ensure the dev server is running (`npm run dev`)
- Check that port 5000 is available
- Increase timeout in test if needed

### "Element not found" errors
- Ensure `data-testid` attributes are present in components
- Check that routes match what tests expect
- Run in headed mode to debug: `./run-tests.sh headed`

## Writing New Tests

1. Add to appropriate priority level (p0/p1/p2)
2. Use helper functions from `helpers/test-utils.ts`
3. Follow dual-user pattern for co-parent tests
4. Add descriptive test names
5. Include both positive and negative scenarios

Example:
```typescript
test('should share new feature between co-parents', async ({ browser }) => {
  const parentAName = generateRandomName();
  const parentBName = generateRandomName();
  
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();
  
  // Test logic here...
  
  await contextA.close();
  await contextB.close();
});
```

## Performance Baselines

- Page load: < 2 seconds
- API response: < 500ms
- WebSocket connection: < 3 seconds
- Chat message delivery: < 1 second

## Support

For issues with tests, check:
1. README.md - Full documentation
2. Test output - Error messages and stack traces
3. Screenshots/videos - Visual debugging
4. Playwright docs - https://playwright.dev
