const { expect } = require('@playwright/test');
const { loadCredentials } = require('../scripts/credentials');

async function login(page) {
    const { username, password } = loadCredentials();

    await page.goto('http://172.17.0.170:8080/lims/login.htm');

    await page.locator('#loginForm\\:username').fill(username);
    await page.locator('#loginForm\\:password').fill(password);
    await page.locator('#loginForm\\:password').press('Enter');

    const selectedRole = await page
        .locator('#roleForm\\:roleOption')
        .inputValue();

    expect(selectedRole).toBe('LIMS_ADMIN');

    await page.getByRole('button', { name: 'OK' }).click();

    await page.waitForLoadState('domcontentloaded');

    await expect(
        page.locator('table[title="LabWare Home"]')
    ).toBeVisible({ timeout: 10000 });

    return { password };
}

module.exports = { login };