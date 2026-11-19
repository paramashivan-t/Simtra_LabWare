const { expect } = require('@playwright/test');
const { loadCredentials } = require('../scripts/credentials');

async function sign(page) {
    const { password } = loadCredentials();

    await page.locator('input[type="password"]').fill(password);

    const signButton = page.getByRole('button', {
        name: 'Sign',
        exact: true
    });

    await expect(signButton).toBeVisible({ timeout: 15000 });
    await expect(signButton).toBeEnabled();

    await signButton.click({ timeout: 15000 });
}

module.exports = { sign };