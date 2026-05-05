import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 1,
  use: {
    headless: false,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10000,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'electron',
    },
  ],
})
