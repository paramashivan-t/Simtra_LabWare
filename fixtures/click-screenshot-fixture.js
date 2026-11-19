const { test: base } = require('@playwright/test');
const { createExecutionRecorder } = require('../scripts/execution-report');

const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const recorder = createExecutionRecorder(page);
    await use(recorder.page);
    await testInfo.attach('Browser action evidence', {
      body: Buffer.from(JSON.stringify(recorder.getSteps())),
      contentType: 'application/json',
    });
  },
});

module.exports = { test };
