
import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    headless: false,
    baseURL: 'http://localhost:5000',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
