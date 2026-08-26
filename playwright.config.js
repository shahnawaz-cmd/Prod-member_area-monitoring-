require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test',
  timeout: 5400000, // 90 minutes in milliseconds
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined, // Keep it sequential on CI to avoid conflicts
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'results.json' }]
  ],
  use: {
    headless: process.env.CI ? true : false,
    trace: 'on',
  },
  projects: [
    // --- SETUPS ---
    {
      name: 'setup',
      testMatch: /global_flow\.setup\.js/,
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'sticker-setup',
      testMatch: /sticker_flow\.setup\.js/,
      use: { ...devices['iPhone 13'] },
    },

    // --- VHR SPEC SUITE (Mobile Safari only) ---
    {
      name: 'mobile-safari',
      testMatch: /global_flow\.spec\.js/,
      use: { 
        ...devices['iPhone 13'],
        storageState: 'state.json', // Automatically load session cookies
      },
      dependencies: ['setup'], // Wait for setup to finish
    },

    // --- WINDOW STICKER SPEC SUITE (Mobile Safari only) ---
    {
      name: 'sticker-mobile-safari',
      testMatch: /sticker_flow\.spec\.js/,
      use: {
        ...devices['iPhone 13'],
        storageState: 'sticker_state.json',
      },
      dependencies: ['sticker-setup'],
    },

    // --- DESKTOP CHROMIUM PROJECTS ---
    {
      name: 'desktop-setup',
      testMatch: /sticker_flow\.setup\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'sticker-desktop-chrome',
      testMatch: /sticker_flow\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'sticker_state.json',
      },
      dependencies: ['desktop-setup'],
    },

    // --- DEDICATED CANCELLATION FLOW ---
    {
      name: 'cancel-subscription',
      testMatch: /cancel_subscription\.spec\.js/,
      use: { ...devices['iPhone 13'] },
    },
  ],
});
