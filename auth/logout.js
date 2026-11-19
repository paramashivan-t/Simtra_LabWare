const { expect } = require('@playwright/test');

async function logout(page) {
    await page.waitForTimeout(1000);

    await page
        .getByRole('listitem')
        .filter({ hasText: 'Log Out' })
        .locator('a')
        .click();

    await expect(
        page.getByText('LabWare 7', { exact: true })
    ).toBeVisible({ timeout: 15000 });

    await page.recordScreenshot(
        'LabWare login page after logout (2-second delay)',
        2000
    );
}

module.exports = { logout };