const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  outputDir: 'test-recording',
  fullyParallel: false,
  reporter: [
    ['list'],
    ['./reporters/extent-testng-reporter.js'],
  ],

  timeout: 120000,

  expect: {
    timeout: 15000,
  },

  use: {
    headless: false,

    viewport: null,

    actionTimeout: 15000,
    navigationTimeout: 30000,

    video: 'on',
    trace: 'on',
    screenshot: 'on',

    launchOptions: {
      args: ['--start-maximized'],
    },

    trace: 'on-first-retry',
  },
});