require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test',
  timeout: 5400000, // 90 minutes in milliseconds
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 3 : undefined, // Run with 3 parallel workers on CI
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'results.json' }]
  ],
  use: {
    headless: process.env.CI ? true : false,
  },
  projects: [
    // --- SETUPS (Run on Safari / WebKit to cache sessions) ---
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

    // --- VHR SPEC SUITES ---
    {
      name: 'mobile-safari',
      testMatch: /global_flow\.spec\.js/,
      use: { 
        ...devices['iPhone 13'],
        storageState: 'state.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      testMatch: /global_flow\.spec\.js/,
      use: {
        ...devices['Pixel 5'],
        storageState: 'state.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-edge',
      testMatch: /global_flow\.spec\.js/,
      use: {
        ...devices['Pixel 5'],
        userAgent: 'Mozilla/5.0 (Linux; Android 10; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36 EdgA/115.0.0.0',
        storageState: 'state.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'samsung-internet',
      testMatch: /global_flow\.spec\.js/,
      use: {
        ...devices['Galaxy S9+'],
        userAgent: 'Mozilla/5.0 (Linux; Android 10; Samsung; SAMSUNG-SM-G973A) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/21.0 Chrome/110.0.5481.154 Mobile Safari/537.36',
        storageState: 'state.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-firefox',
      testMatch: /global_flow\.spec\.js/,
      use: {
        browserName: 'firefox',
        viewport: { width: 390, height: 844 }, // iPhone 13 viewport size
        isMobile: true,
        hasTouch: true,
        storageState: 'state.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'desktop-chrome',
      testMatch: /global_flow\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'state.json',
      },
      dependencies: ['setup'],
    },

    // --- WINDOW STICKER SPEC SUITES ---
    {
      name: 'sticker-mobile-safari',
      testMatch: /sticker_flow\.spec\.js/,
      use: {
        ...devices['iPhone 13'],
        storageState: 'sticker_state.json',
      },
      dependencies: ['sticker-setup'],
    },
    {
      name: 'sticker-mobile-chrome',
      testMatch: /sticker_flow\.spec\.js/,
      use: {
        ...devices['Pixel 5'],
        storageState: 'sticker_state.json',
      },
      dependencies: ['sticker-setup'],
    },
    {
      name: 'sticker-mobile-edge',
      testMatch: /sticker_flow\.spec\.js/,
      use: {
        ...devices['Pixel 5'],
        userAgent: 'Mozilla/5.0 (Linux; Android 10; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Mobile Safari/537.36 EdgA/115.0.0.0',
        storageState: 'sticker_state.json',
      },
      dependencies: ['sticker-setup'],
    },
    {
      name: 'sticker-samsung-internet',
      testMatch: /sticker_flow\.spec\.js/,
      use: {
        ...devices['Galaxy S9+'],
        userAgent: 'Mozilla/5.0 (Linux; Android 10; Samsung; SAMSUNG-SM-G973A) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/21.0 Chrome/110.0.5481.154 Mobile Safari/537.36',
        storageState: 'sticker_state.json',
      },
      dependencies: ['sticker-setup'],
    },
    {
      name: 'sticker-mobile-firefox',
      testMatch: /sticker_flow\.spec\.js/,
      use: {
        browserName: 'firefox',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        storageState: 'sticker_state.json',
      },
      dependencies: ['sticker-setup'],
    },
    {
      name: 'sticker-desktop-chrome',
      testMatch: /sticker_flow\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'sticker_state.json',
      },
      dependencies: ['sticker-setup'],
    },
  ],
});
