# PeacePad E2E Test Suite

Comprehensive end-to-end tests for PeacePad co-parenting platform using Playwright.

## Test Coverage

### P0 - Critical Tests
- **Partnership Flow** (`p0-partnership-flow.spec.ts`)
  - Two-user partnership creation via invite codes
  - Real-time WebSocket notifications
  - Invalid code rejection
  - Self-join prevention
  
- **Invite Code Persistence** (`p0-invite-code-persistence.spec.ts`)
  - Code preservation during photo uploads
  - Code preservation during name changes
  - Code display in settings

- **Shared Data Visibility** (`p0-shared-data.spec.ts`)
  - Tasks shared between co-parents
  - Notes shared between co-parents
  - Child updates shared between co-parents
  - Expenses shared between co-parents
  - Calendar events shared between co-parents
  - Pets shared between co-parents

- **Real-Time Chat** (`p0-realtime-chat.spec.ts`)
  - Message sending and receiving
  - Message timestamps
  - Typing indicators
  - Bidirectional messaging

### P1 - Important Tests
- **AI Tone Analysis** (`p1-ai-tone-analysis.spec.ts`)
  - Tone badge display (mock mode)
  - Emoji suggestions
  - Rewording suggestions
  - Pre-send analysis

- **Call Joining** (`p1-call-joining.spec.ts`)
  - Session code generation
  - Multi-user call joining
  - Camera/mic permissions UI
  - Video preview

- **Find Support** (`p1-find-support.spec.ts`)
  - Postal code search
  - Category filtering
  - Resource details
  - Map display

- **Settings** (`p1-settings.spec.ts`)
  - Notification toggles
  - Display name changes
  - Invite code display/copy
  - Dark mode toggle
  - Activity logs

### P2 - Nice-to-Have Tests
- **Intro Slideshow** (`p2-intro-slideshow.spec.ts`)
  - First-time user experience
  - Auto-progression
  - Skip functionality
  - Returning user behavior
  - Swipe navigation

- **Accessibility** (`p2-accessibility.spec.ts`)
  - Keyboard navigation
  - ARIA labels
  - Dark mode
  - Color contrast
  - Screen reader support
  - Semantic HTML

### Non-Functional Tests (`non-functional.spec.ts`)
- Page load performance (<2s)
- Session persistence
- Cache clearing on logout
- PWA offline handling
- Cross-browser compatibility (Firefox)
- Concurrent user handling
- API response times (<500ms)

## Running Tests

### Prerequisites
```bash
npm install
npx playwright install
```

### Run All Tests
```bash
npm run test:e2e
```

### Run Specific Test Suite
```bash
# P0 Critical Tests
npm run test:e2e:p0

# P1 Important Tests
npm run test:e2e:p1

# P2 Nice-to-Have Tests
npm run test:e2e:p2

# Non-Functional Tests
npm run test:e2e:nf
```

### Run in UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Run in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Run Specific Test File
```bash
npx playwright test e2e/p0-partnership-flow.spec.ts
```

### Run in Debug Mode
```bash
npx playwright test --debug
```

## Test Architecture

### Dual-User Testing
Many tests simulate two separate co-parents using **separate browser contexts** to avoid session sharing issues. This mirrors real-world usage where each parent has their own device/browser.

```typescript
const contextA = await browser.newContext();
const contextB = await browser.newContext();

const pageA = await contextA.newPage();
const pageB = await contextB.newPage();
```

### Helper Functions
Located in `helpers/test-utils.ts`:
- `createGuestUser()` - Create guest user session
- `completeOnboarding()` - Complete onboarding flow
- `joinPartnership()` - Join partnership via invite code
- `sendMessage()` - Send chat message
- `createTask()` - Create shared task
- `createNote()` - Create shared note
- `generateRandomName()` - Generate unique test names
- `getInviteCode()` - Extract invite code from settings

### Data Test IDs
All tests rely on `data-testid` attributes for stable element selection:
- `button-*` - Interactive buttons
- `input-*` - Form inputs
- `text-*` - Display text
- `toggle-*` - Toggle switches
- `card-*` - Card components

## CI/CD Integration

The tests are configured to run in CI environments with:
- Automatic retries (2x in CI)
- Screenshot/video capture on failure
- HTML report generation
- Single worker for stability

## Debugging Failed Tests

1. **Check Screenshots**: `playwright-report/` folder contains failure screenshots
2. **Watch Videos**: Videos are retained on failure
3. **Use Trace Viewer**: Run with `--trace on` and open with `npx playwright show-trace`
4. **Check Console Logs**: Browser console logs are captured in test output

## Known Limitations

- Some tests check for UI elements with conditional visibility (graceful fallback)
- WebSocket timing may vary - tests include appropriate timeouts
- Camera/mic permissions require mock data in headless mode
- Map rendering tests may require actual API keys in production

## Contributing

When adding new tests:
1. Follow the priority system (P0/P1/P2)
2. Use descriptive test names
3. Add helper functions for reusable logic
4. Include appropriate data-testid attributes in components
5. Test both positive and negative scenarios
6. Use separate contexts for multi-user tests
