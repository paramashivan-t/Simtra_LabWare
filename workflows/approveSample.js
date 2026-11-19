const { expect } = require('@playwright/test');
const { sign } = require('../auth/sign');

async function approveSample(page) {

    const runMenu = page.getByText('Run', { exact: true });

    await expect(runMenu).toBeVisible({ timeout: 15000 });
    await runMenu.click();

    await page.getByText('Review...').click();

    await page.waitForTimeout(1000);

    await expect(
        page.getByText('Sample Prompter')
    ).toBeVisible({ timeout: 15000 });

    const page3Promise = page.waitForEvent('popup');

    await page.getByRole('button', { name: 'OK' }).click();

    const page3 = await page3Promise;

    await expect(
        page3.locator('#mf\\:taskTitle')
    ).toHaveText('Review Dialog', { timeout: 15000 });

    const authorizeBtn = page3.locator(
        'a.task-toolbar-cell:has(img[title="Authorize"])'
    );

    await expect(authorizeBtn).toBeVisible({
        timeout: 15000
    });

    await authorizeBtn.click();

    await page3
        .locator('button:has-text("Select All")')
        .dblclick();

    await page3
        .locator('a[role="button"]:has(.ui-icon-triangle-1-s)')
        .last()
        .click();

    const calcError = page3.locator(
        'td[ec_value="CALC"]'
    );

    await expect(calcError).toBeVisible({
        timeout: 10000
    });

    await calcError.click();

    await page.waitForTimeout(1000);

    await sign(page3);

    await page.waitForTimeout(1000);

    await page3
        .locator('a:has(img[title="Exit"])')
        .last()
        .evaluate(el => el.click());

    await page3.waitForEvent('close');
}

module.exports = { approveSample };