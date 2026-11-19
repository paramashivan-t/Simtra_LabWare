const fs = require('node:fs');
const path = require('node:path');

const ACTION_METHODS = new Set([
  'goto',
  'click',
  'dblclick',
  'evaluate',
  'fill',
  'clear',
  'check',
  'uncheck',
  'selectOption',
  'selectText',
  'press',
  'type',
  'setInputFiles',
  'hover',
  'focus',
  'tap',
  'dragTo',
  'dispatchEvent',
]);

const LOCATOR_METHODS = new Set([
  'contentFrame',
  'first',
  'filter',
  'frameLocator',
  'getByLabel',
  'getByPlaceholder',
  'getByRole',
  'getByTestId',
  'getByText',
  'last',
  'locator',
  'nth',
]);

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character];
  });
}

function formatArguments(args) {
  return args
    .map((argument) => {
      if (typeof argument === 'string') return JSON.stringify(argument);
      if (argument && typeof argument === 'object') {
        return JSON.stringify(argument);
      }
      return String(argument);
    })
    .join(', ');
}

function createExecutionRecorder(page) {
  const steps = [];
  const proxies = new WeakMap();

  async function captureScreenshot(step, targetPage) {
    try {
      const screenshot = await targetPage.screenshot({
        type: 'jpeg',
        quality: 45,
        fullPage: false,
      });
      step.screenshot = screenshot.toString('base64');
    } catch (error) {
      step.screenshotError = error.message;
      step.status = 'FAIL';
      step.actualResult = `${step.actualResult}; screenshot failed: ${error.message}`;
      throw error;
    }
  }

  function wrap(target, description, isPage = false, ownerPage = null) {
    if (!target || typeof target !== 'object') return target;
    if (proxies.has(target)) return proxies.get(target);

    const proxy = new Proxy(target, {
      get(object, property) {
        if (property === 'recordScreenshot' && isPage) {
          return async (stepDescription, delayMs = 0) => {
            const step = {
              description: stepDescription,
              expectedResult: 'The expected page state is visible in the screenshot.',
              actualResult: 'Capturing page checkpoint.',
              startedAt: new Date().toISOString(),
              status: 'PASS',
            };
            steps.push(step);

            try {
              if (delayMs > 0) {
                await object.waitForTimeout(delayMs);
              }
              await captureScreenshot(step, object);
              step.actualResult = 'Page checkpoint captured successfully.';
            } catch (error) {
              step.status = 'FAIL';
              step.actualResult = `Page checkpoint failed: ${error.message}`;
              throw error;
            } finally {
              step.completedAt = new Date().toISOString();
            }
          };
        }

        const member = Reflect.get(object, property, object);
        if (typeof member !== 'function') return member;

        return (...args) => {
          if (ACTION_METHODS.has(property)) {
            const detail =
              property === 'press' && args.length > 1
                ? ` (${String(args[1])})`
                : '';
            const step = {
              description: `${String(property)} ${description}${detail}`,
              expectedResult: 'The browser action completes successfully.',
              actualResult: 'Action in progress.',
              startedAt: new Date().toISOString(),
              status: 'PASS',
            };
            steps.push(step);

          
            return (async () => {
              let actionError;
              const targetPage = isPage ? object : ownerPage;
              let fallbackScreenshot;

              if (['click', 'dblclick', 'evaluate'].includes(property)) {
                try {
                  fallbackScreenshot = await targetPage.screenshot({
                    type: 'jpeg',
                    quality: 45,
                    fullPage: false,
                  });
                } catch {
                  fallbackScreenshot = null;
                }
              }

              try {
                await Reflect.apply(member, object, args);
                step.actualResult = 'Action completed successfully.';
              } catch (error) {
                actionError = error;
                step.status = 'FAIL';
                step.actualResult = `Action failed: ${error.message}`;
              }

              try {
                await captureScreenshot(step, targetPage);
              } catch (error) {
                if (fallbackScreenshot) {
                  step.screenshot = fallbackScreenshot.toString('base64');
                  step.screenshotError = error.message;
                  step.screenshotTiming = 'before action; the page closed before a later screenshot was possible';
                  step.status = actionError ? 'FAIL' : 'PASS';
                  if (!actionError) {
                    step.actualResult += ' A pre-action screenshot is used because the page closed before a post-action screenshot was possible.';
                  }
                } else if (!actionError) {
                  step.status = 'FAIL';
                }
              }

              step.completedAt = new Date().toISOString();
              if (actionError) throw actionError;
            })();
          }

          if (property === 'context') {
            const context = Reflect.apply(member, object, args);
            return wrap(context, 'context', false, ownerPage);
          }

          const result = Reflect.apply(member, object, args);

          if (property === 'waitForEvent' && ['page', 'popup'].includes(args[0])) {
            return result.then((popup) => {
              return wrap(popup, 'popup page', true, popup);
            });
          }

          if (property === 'pages') {
            return result.map((page) => wrap(page, 'page', true, page));
          }

          if (LOCATOR_METHODS.has(property)) {
            const argsDescription = formatArguments(args);
            const childDescription = `${description}.${String(property)}(${argsDescription})`;
            return wrap(
              result,
              childDescription,
              false,
              isPage ? object : ownerPage,
            );
          }

          return result;
        };
      },
    });

    proxies.set(target, proxy);
    return proxy;
  }

  async function writePdf(testInfo) {
    const outputDirectory = path.join(process.cwd(), 'test-results');
    fs.mkdirSync(outputDirectory, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const retrySuffix = testInfo.retry ? `-retry${testInfo.retry}` : '';
    const outputPath = path.join(
      outputDirectory,
      `main-workflow-${timestamp}${retrySuffix}.pdf`,
    );
    const rows = steps
      .map((step, index) => {
        const screenshot = step.screenshot
          ? `<img src="data:image/jpeg;base64,${step.screenshot}" alt="Screenshot after step ${index + 1}">`
          : `<div class="missing">Screenshot unavailable: ${escapeHtml(step.screenshotError || 'not captured')}</div>`;
        return `
          <section class="step">
            <h2>Step ${index + 1}: ${escapeHtml(step.description)}</h2>
            <table>
              <thead><tr><th>Pass/Fail</th><th>Expected result</th><th>Actual result</th></tr></thead>
              <tbody><tr class="${step.status.toLowerCase()}">
                <td>${step.status}</td>
                <td>${escapeHtml(step.expectedResult)}</td>
                <td>${escapeHtml(step.actualResult)}</td>
              </tr></tbody>
            </table>
            ${screenshot}
          </section>`;
      })
      .join('');
    const passed = steps.filter((step) => step.status === 'PASS').length;
    const failed = steps.length - passed;
    const html = `<!doctype html>
      <html><head><meta charset="utf-8"><style>
        @page { size: A4 landscape; margin: 0.35in; }
        body { font: 10pt Arial, sans-serif; color: #202124; margin: 0; }
        h1 { font-size: 18pt; margin: 0 0 6pt; }
        h2 { font-size: 11pt; margin: 0 0 6pt; overflow-wrap: anywhere; }
        .summary { margin: 0 0 12pt; }
        .step { break-before: page; page-break-before: always; }
        .step:first-of-type { break-before: auto; page-break-before: auto; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 8pt; table-layout: fixed; }
        th, td { border: 1px solid #9aa0a6; padding: 5pt; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
        th { background: #e8eaed; }
        .pass td:first-child { color: #137333; font-weight: bold; }
        .fail td:first-child { color: #b3261e; font-weight: bold; }
        img { display: block; width: 100%; max-height: 5.4in; object-fit: contain; object-position: top left; }
        .missing { border: 1px solid #b3261e; padding: 12pt; color: #b3261e; }
      </style></head><body>
        <h1>Main workflow execution report</h1>
        <p class="summary">Test status: ${escapeHtml(testInfo.status || 'unknown')} | Steps: ${steps.length} | Pass: ${passed} | Fail: ${failed}</p>
        <p class="summary">Step results show whether each Playwright action completed; they do not independently verify business outcomes.</p>
        ${rows || '<p>No browser actions were recorded.</p>'}
      </body></html>`;

    const reportPage = await page.context().newPage();
    try {
      await reportPage.setContent(html, { waitUntil: 'load' });
      await reportPage.pdf({
        path: outputPath,
        format: 'A4',
        landscape: true,
        printBackground: true,
      });
    } finally {
      await reportPage.close();
    }

    return outputPath;
  }

  return {
    page: wrap(page, 'page', true, page),
    writePdf,
    getSteps: () => steps,
  };
}

module.exports = { createExecutionRecorder };
