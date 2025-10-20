const { defineConfig, devices } = require('@playwright/test');

/**
 * PEACEPAD E2E TEST CONFIGURATION
 * 
 * This configuration file sets up Playwright for testing PeacePad.
 * It includes settings for timeouts, screenshots, videos, and browser configurations.
 */

module.exports = defineConfig({
  // Test directory
  testDir: './tests',
  
  // Maximum time one test can run (30 seconds)
  timeout: 30000,
  
  // Maximum time for expect() assertions (10 seconds)
  expect: {
    timeout: 10000,
  },

  // Run tests in files in parallel
  fullyParallel: false, // Set to false for partnership tests that need sequential setup
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry failed tests on CI
  retries: process.env.CI ? 2 : 0,
  
  // Number of parallel workers
  workers: process.env.CI ? 1 : 1, // Use 1 worker to avoid conflicts

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'test-results/html-report' }],
    ['list']
  ],

  // Shared settings for all projects
  use: {
    // Base URL for all tests
    baseURL: 'https://peace-pad-ai-2rqkkxbq5g.replit.app',
    
    // Capture screenshot only when test fails
    screenshot: 'only-on-failure',
    
    // Record video only when test fails
    video: 'retain-on-failure',
    
    // Collect trace when retrying failed test
    trace: 'on-first-retry',
    
    // Maximum time for each action (click, fill, etc.)
    actionTimeout: 15000,
    
    // Maximum time to wait for navigation
    navigationTimeout: 30000,
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Add extra browser context options
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Uncomment to test on Firefox
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // Uncomment to test on WebKit (Safari)
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Test against mobile viewports
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // Run your local dev server before starting the tests
  // Uncomment if you want to test against localhost
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:5000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
