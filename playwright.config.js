const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test',
  timeout: 5400000, // 90 minutes in milliseconds
  reporter: 'html', // Enable HTML report
  use: {
    headless: false,
  },
  projects: [
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
