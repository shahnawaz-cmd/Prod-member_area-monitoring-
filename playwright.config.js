require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test',
  timeout: 5400000, // 90 minutes in milliseconds
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'results.json' }]
  ],
  use: {
    headless: process.env.CI ? true : false,
  },
  projects: [
    // 1. Setup Project (runs global_flow.setup.js to generate state.json session cookies)
    {
      name: 'setup',
      testMatch: /global_flow\.setup\.js/,
      use: { ...devices['iPhone 13'] },
    },
    // 2. Main Project (runs global_flow.spec.js in parallel loading state.json)
    {
      name: 'mobile-safari',
      testMatch: /global_flow\.spec\.js/,
      use: { 
        ...devices['iPhone 13'],
        storageState: 'state.json', // Automatically load session cookies
      },
      dependencies: ['setup'], // Wait for setup to finish
    },
    // 3. Sticker Setup Project (runs sticker_flow.setup.js to generate sticker_state.json)
    {
      name: 'sticker-setup',
      testMatch: /sticker_flow\.setup\.js/,
      use: { ...devices['iPhone 13'] },
    },
    // 4. Sticker Main Project (runs sticker_flow.spec.js in parallel loading sticker_state.json)
    {
      name: 'sticker-mobile-safari',
      testMatch: /sticker_flow\.spec\.js/,
      use: {
        ...devices['iPhone 13'],
        storageState: 'sticker_state.json',
      },
      dependencies: ['sticker-setup'],
    },
  ],
});
