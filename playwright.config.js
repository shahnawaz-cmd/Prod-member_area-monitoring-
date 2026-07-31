require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test',
  timeout: 5400000, // 90 minutes in milliseconds
  retries: process.env.CI ? 2 : 0,
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
  ],
});
