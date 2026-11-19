import { expect } from '@playwright/test';
const { test } = require('../fixtures/click-screenshot-fixture');
const { login } = require('../auth/login');
const { logout } = require('../auth/logout');
const { sign } = require('../auth/sign');
const { receiveSample } = require('../workflows/receiveSample');
const { approveSample } = require('../workflows/approveSample');

test('test', async ({ page }) => {
  // Login LabWare 7
  await login(page);

  // Click Sample Login using AD-HOC
  await page.waitForTimeout(2000);
  await page.locator('li.main-toolbar-cell:has-text("Sample Login") .main-toolbar-cell-recents').evaluate(el => {
  el.style.display = 'block';
  });
  const adhoc = page.locator('div.main-toolbar-cell-recents[style*="display: block"] li').first();
  await expect(adhoc).toBeVisible({ timeout: 15000 });
  const context = page.context();
  const newPagePromise = context.waitForEvent('page');
  await adhoc.click({ force: true });
  const page1 = await newPagePromise;
  await page1.waitForLoadState();

  // Navigate to Sample Login (page 1) and creation of sample with analysis
  await expect(page.locator('#mf\\:mainToolbar')).toBeVisible({timeout: 15000});
  await page1.waitForLoadState('domcontentloaded');
  await expect(page1.locator('#mf')).toContainText('SummaryR&DContract');
  const description = page1.locator('input.textInput').first();
  await description.click();
  await description.fill('DemoTest'); // Fill the description field with 'DemoTest'
  await expect(description).toHaveValue('DemoTest');
  await page1.locator('img[title="Log Sample"]').click();
  await expect(page1.getByText('Test Editor :')).toBeVisible({ timeout: 15000 });
  await page1.waitForLoadState('domcontentloaded');
  const addAnalysisButton = page1.locator('div[id*="addButton_uid"] button');
  await expect(addAnalysisButton).toHaveCount(1, { timeout: 15000 });
  await expect(addAnalysisButton).toBeVisible({ timeout: 15000 });
  await expect(addAnalysisButton).toBeEnabled();
  await addAnalysisButton.click({ timeout: 15000 }); // Add analysis
  await page1.keyboard.press('Enter');
  await page1.keyboard.press('Enter');
  const phRow = page1.getByText('11415_S_PH');
  await expect(phRow).toBeVisible({ timeout: 10000 });
  await phRow.click();
  await page1.locator('button:has-text("OK")').last().click();
  await expect(page1.getByRole('cell', { name: '1', exact: true })).toBeVisible({ timeout: 15000 });
  await page1.getByText('Test Editor :').click();
  await page1.locator('button:has-text("OK")').last().click();
  await expect(page1.getByText('Proceed receiving sample')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
  await page1.locator('button:has-text("OK")').last().click();
  await page.waitForTimeout(1000);
  await page1.locator('a:has(img[title="Exit"])').last().evaluate(el => el.click());
  await page1.waitForEvent('close');

  // Navigate to Receive Samples and receive the sample
  await receiveSample(page);

  // Navigate to Enter Results (page 2) and enter the result for the sample
  await page.waitForTimeout(1000);
  const runMenu = page.getByText('Run', { exact: true });
  await expect(runMenu).toBeVisible({ timeout: 15000 });
  await runMenu.click();
  await page.waitForTimeout(1000);
  const enterResultsMenuItem = page.getByText('Enter Results...', { exact: true });
  await expect(enterResultsMenuItem).toBeVisible({ timeout: 15000 });
  await enterResultsMenuItem.click();
  await page.waitForTimeout(1000);
  await expect(page.getByText('Sample Prompter')).toBeVisible({ timeout: 15000 });
  const page2Promise = page.context().waitForEvent('page');
  await page.getByRole('button', { name: 'OK' }).click();
  const page2 = await page2Promise;
  await page2.waitForLoadState('domcontentloaded');
  await expect(page2.getByText('Result Entry', { exact: true })).toBeVisible({ timeout: 10000 });
  await page2.waitForLoadState('domcontentloaded');
  // Result cell selection and entering the result value
  const valueCell = page2.locator('td[align="left"][style*="background-color: rgb(214, 230, 238)"]')
  await expect(valueCell).toBeVisible();
  await valueCell.click();
  await page2.keyboard.type('3');
  const saveButton = page2.locator('a:has(img[title="Save"])');
  await expect(saveButton).toBeVisible({ timeout: 10000 });
  await saveButton.click();
  await page.waitForTimeout(1000);
  await page2.locator('button:has-text("Select All")').click();
  await page2.locator('a[role="button"]:has(.ui-icon-triangle-1-s)').last().click();
  const calcError = page2.locator('td[ec_value="CALC"]');
  await expect(calcError).toBeVisible({ timeout: 10000 });
  await calcError.click(); // Enter the reason for the result entry
  await page.waitForTimeout(1000);
  await sign(page2);
  await page.waitForTimeout(1000);
  await page2.locator('a:has(img[title="Exit"])').last().evaluate(el => el.click());
  await page2.waitForEvent('close');

  // Navigate to Review (page 3) and authorize the sample
  await approveSample(page);

  // Navigate to View Samples (page 4) and audit the sample status
  await page.getByText('Run', { exact: true }).click();
  await page.getByText('View Samples...').click();
  await page.waitForTimeout(1000);
  await expect(page.getByText('Sample Prompter')).toBeVisible({ timeout: 15000 });
  const page4Promise = page.context().waitForEvent('page');
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'OK' }).click();
  const page4 = await page4Promise;
  await expect(page4.locator('#mf\\:taskTitle')).toHaveText('Sample Window', { timeout: 15000 });
  const taskPage = page.context().pages().find(p => p.url().includes('task_uid_'));
  await page.waitForTimeout(1000);
  await expect(taskPage.getByText('Date Completed')).toBeVisible({ timeout: 15000 });
  await expect(taskPage.getByText('Date Started')).toBeVisible({ timeout: 15000 });
  await expect(taskPage.getByText('Date Reviewed')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(1000);;
  await page4.locator('a:has(img[title="Exit"])').last().evaluate(el => el.click());
  await page4.waitForEvent('close');

  // Logout from the application
  await logout(page);
});