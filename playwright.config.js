require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test',
  timeout: 5400000, // 90 minutes in milliseconds
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  quiet: !process.env.VERBOSE,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'results.json' }]
  ],
  use: {
    headless: process.env.CI ? true : false,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // --- SETUPS ---
    {
      name: 'setup',
      testMatch: /global_flow\.setup\.js/,
      use: { ...devices['Pixel 10 Pro XL'] },
    },
    {
      name: 'sticker-setup',
      testMatch: /sticker_flow\.setup\.js/,
      use: { ...devices['Pixel 10 Pro XL'] },
    },

    // --- VHR SPEC SUITE (Mobile Chrome only) ---
    {
      name: 'mobile-chrome',
      testMatch: /global_flow\.spec\.js/,
      use: { 
        ...devices['Pixel 10 Pro XL'],
        storageState: 'state.json', // Automatically load session cookies
      },
      dependencies: ['setup'], // Wait for setup to finish
    },

    // --- WINDOW STICKER SPEC SUITE (Mobile Chrome only) ---
    {
      name: 'sticker-mobile-chrome',
      testMatch: /sticker_flow\.spec\.js/,
      use: {
        ...devices['Pixel 10 Pro XL'],
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
      use: { ...devices['Pixel 10 Pro XL'] },
    },

    // --- SESSION IP STICKINESS FLOW ---
    {
      name: 'session-ip-stickiness',
      testMatch: /session_ip_stickiness\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
