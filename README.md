# Simtra-Automation

A local JavaScript browser-automation project using Playwright Test.

## Setup

Requirements: Node.js 20 or later and npm. From the project folder, check that they are installed:

```powershell
node --version
npm.cmd --version
```

Install the project dependencies and the Chromium browser used by the tests:

```powershell
npm.cmd ci
npx.cmd playwright install chromium
```

You can also run tests with a visible browser or use Playwright's UI mode:

```powershell
npm.cmd run test:headed
npm.cmd run test:ui
```

## LIMS workflow

The end-to-end LIMS test is `tests/sampleLifecycle.spec.js`. It uses the shared login, receive, sign, review, and logout helpers with the same Playwright page and authenticated session:

```powershell
npm.cmd test -- tests/sampleLifecycle.spec.js
```

Each run creates a timestamped `ExtentTestNGReport-<run-time>.html` in `test-results/`, so later runs do not overwrite earlier reports. Actions and screenshots are displayed in timeline order, with action-level pass/fail status and expected and actual results. Typed field values are not included in action descriptions. The report's action-level result means the Playwright action completed or failed; it does not independently verify every business outcome.

The reusable steps live in `workflows/`. Keep login in the main workflow; Playwright does not share a logged-in browser session between separate tests.

## Sign-in and secrets

Set the login credentials in `Resources/.env`:

```dotenv
SIMTRA_USERNAME=your-username
SIMTRA_PASSWORD=your-password
```

`Resources/.env` is ignored by Git. Alternatively, set `SIMTRA_USERNAME` and `SIMTRA_PASSWORD` in the process environment before running tests. Do not commit credentials or paste them into recorded test scripts.

The shared `loadCredentials()` helper reads these values for login and electronic-signature steps. Credentials in `.env` are plaintext, so protect access to your Windows account and do not share the file.
