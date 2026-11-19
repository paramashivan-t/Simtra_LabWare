const fs = require('node:fs/promises');
const path = require('node:path');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

class ExtentTestNGReporter {
  onBegin() {
    this.results = [];
    this.runStartedAt = new Date();
  }

  onTestEnd(test, result) {
    this.results.push({ test, result });
  }

  async onEnd() {
    if (!this.results.length) return;

    const testsHtml = [];
    for (const [testIndex, { test, result }] of this.results.entries()) {
      const status = result.status.toUpperCase();
      const evidence = result.attachments.find(
        attachment => attachment.name === 'Browser action evidence',
      );
      let steps = [];
      if (evidence && (evidence.path || evidence.body)) {
        try {
          const body = evidence.path
            ? await fs.readFile(evidence.path, 'utf8')
            : Buffer.from(evidence.body).toString('utf8');
          steps = JSON.parse(body);
        } catch (error) {
          steps = [{
            description: 'Reading browser action evidence',
            status: 'FAIL',
            actualResult: `Could not read the recorded evidence: ${error.message}`,
          }];
        }
      }

      steps.sort((left, right) => (
        new Date(left.startedAt || 0) - new Date(right.startedAt || 0)
      ));

      const stepsHtml = steps.map((step, index) => {
        const screenshot = step.screenshot
          ? `<img src="data:image/jpeg;base64,${step.screenshot}" alt="Screenshot after action ${index + 1}">`
          : `<p class="missing">Screenshot unavailable: ${escapeHtml(step.screenshotError || 'not captured')}</p>`;
        const actionTime = step.startedAt
          ? new Date(step.startedAt).toLocaleTimeString()
          : '';
        return `<li class="step">
          <h4><time>${escapeHtml(actionTime)}</time> <span class="status ${step.status === 'PASS' ? 'passed' : 'failed'}">${escapeHtml(step.status || 'UNKNOWN')}</span> ${escapeHtml(step.description || 'Browser action')}</h4>
          <p><b>Expected:</b> ${escapeHtml(step.expectedResult || 'The browser action completes successfully.')}</p>
          <p><b>Actual:</b> ${escapeHtml(step.actualResult || '')}</p>
          ${step.screenshotTiming ? `<p class="meta">${escapeHtml(step.screenshotTiming)}</p>` : ''}
          ${step.screenshotError ? `<p class="missing">Post-action screenshot unavailable: ${escapeHtml(step.screenshotError)}</p>` : ''}
          ${screenshot}
        </li>`;
      }).join('');

      const error = result.error
        ? `<pre class="error">${escapeHtml(result.error.message || result.error)}</pre>`
        : '';
      testsHtml.push(`
        <section class="test-card">
          <header><span class="status ${status.toLowerCase()}">${status}</span>
            <strong>${escapeHtml(test.title)}</strong>
            <span class="duration">${(result.duration / 1000).toFixed(2)} s</span>
          </header>
          <p class="meta">${escapeHtml(test.location.file)}:${test.location.line}</p>
          ${error}
          <details ${result.status === 'failed' ? 'open' : ''}>
            <summary>Browser action evidence (${steps.length} actions)</summary>
            <ol class="evidence">${stepsHtml}</ol>
          </details>
        </section>`);
    }

    const passed = this.results.filter(({ result }) => result.status === 'passed').length;
    const failed = this.results.filter(({ result }) => result.status === 'failed').length;
    const skipped = this.results.filter(({ result }) => result.status === 'skipped').length;
    const generatedAt = this.runStartedAt.toLocaleString();
    const report = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LabWare Automation Report</title>
  <style>
    :root { color-scheme: light; font-family: Arial, sans-serif; background: #f3f5f7; color: #263238; }
    body { margin: 0; }
    .top { padding: 22px 5%; color: white; background: #263238; }
    .top h1 { margin: 0 0 8px; font-size: 24px; }
    main { max-width: 1200px; margin: 24px auto; padding: 0 20px; }
    .summary, .test-card { background: white; border-radius: 6px; box-shadow: 0 2px 8px #00000012; }
    .summary { display: flex; gap: 30px; padding: 18px 22px; margin-bottom: 18px; }
    .summary b { font-size: 20px; }
    .test-card { margin: 14px 0; padding: 18px 22px; }
    .test-card header { display: flex; align-items: center; gap: 12px; }
    .status { padding: 5px 9px; border-radius: 4px; color: white; font-size: 12px; }
    .passed { background: #28a745; } .failed { background: #dc3545; }
    .skipped, .timedout, .interrupted { background: #d39e00; }
    .duration, .meta { color: #73808a; }
    .duration { margin-left: auto; }
    .meta { font-size: 12px; }
    details { margin-top: 16px; }
    summary { cursor: pointer; font-weight: bold; }
    .evidence { padding-left: 24px; }
    .step { margin: 16px 0; padding: 14px; border: 1px solid #e1e5e8; border-radius: 4px; list-style: decimal; }
    .step h4 { margin: 0 0 8px; overflow-wrap: anywhere; font-size: 14px; }
    .step img { display: block; max-width: 100%; height: auto; border: 1px solid #dfe3e6; }
    pre { overflow: auto; white-space: pre-wrap; background: #f6f7f8; padding: 10px; }
    .error { border-left: 4px solid #dc3545; }
    .missing { color: #b3261e; }
  </style>
</head>
<body>
  <div class="top"><h1>Extent TestNG Report</h1><div>Generated: ${escapeHtml(generatedAt)}</div></div>
  <main>
    <div class="summary">
      <div>Total <b>${this.results.length}</b></div>
      <div>Passed <b>${passed}</b></div>
      <div>Failed <b>${failed}</b></div>
      <div>Skipped <b>${skipped}</b></div>
    </div>
    ${testsHtml.join('\n')}
  </main>
</body>
</html>`;

    const outputDir = path.resolve(__dirname, '..', 'test-results');
    await fs.mkdir(outputDir, { recursive: true });
    const runId = this.runStartedAt.toISOString().split('.')[0].replace(/:/g, '-');
    await fs.writeFile(
      path.join(outputDir, `LabWare Report-${runId}.html`),
      report,
      'utf8',
    );
  }
}

module.exports = ExtentTestNGReporter;
