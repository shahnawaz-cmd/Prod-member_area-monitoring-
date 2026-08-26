const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'results.json' }]
  ],
});
