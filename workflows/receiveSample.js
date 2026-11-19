const { expect } = require('@playwright/test');

async function receiveSample(page) {

    const runMenu = page.getByText('Run', { exact: true });

    await expect(runMenu).toBeVisible({ timeout: 15000 });
    await runMenu.click();

    await page.waitForTimeout(1000);

    await page.getByText('Modify Samples', { exact: true }).click();
    await page.getByText('Receive...', { exact: true }).click();

    await page.waitForTimeout(1000);

    await expect(
        page.getByText('Sample Prompter')
    ).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'OK' }).click();

    await page.waitForLoadState('domcontentloaded');

    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'OK' }).click();
}

module.exports = { receiveSample };