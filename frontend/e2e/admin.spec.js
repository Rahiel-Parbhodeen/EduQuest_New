import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
const password = 'ApplicationPass12!';
async function register(page, email, name) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('First and last name').fill(name);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
}
async function login(page, email, pass) {
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(pass);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
}
async function submitCv(page) {
  await page
    .getByRole('button', { name: 'Become a lecturer', exact: true })
    .click();
  await page.getByLabel('CV', { exact: true }).setInputFiles({
    name: 'teaching-cv.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.7\nTeaching CV fixture\n%%EOF'),
  });
  await page.getByRole('button', { name: 'Send lecturer request' }).click();
  await expect(
    page.getByText('Your request is awaiting administrator review.'),
  ).toBeVisible();
}
test('admin reviews a private CV, approves lecturer access and edits user role/password/record', async ({
  page,
  browser,
}) => {
  const email = `approved-${test.info().project.name}-${Date.now()}@example.com`;
  await register(page, email, 'Browser Applicant');
  await submitCv(page);
  const context = await browser.newContext({ viewport: page.viewportSize() });
  const admin = await context.newPage();
  await login(admin, 'demo-admin@example.com', 'EduQuestDemo123!');
  await expect(
    admin.getByRole('heading', { name: 'Lecturer requests', level: 2 }),
  ).toBeVisible();
  const card = admin.locator('article.card').filter({ hasText: email });
  await expect(card).toHaveCount(1);
  const download = admin.waitForEvent('download');
  await card.getByRole('link', { name: /Download CV/ }).click();
  expect((await download).suggestedFilename()).toBe('teaching-cv.pdf');
  await card.getByLabel('Review note').fill('Teaching experience reviewed.');
  await admin.screenshot({
    path: '../admin-inbox-' + test.info().project.name + '.png',
    fullPage: true,
  });
  await card.getByRole('button', { name: 'Approve request' }).click();
  await expect(
    admin.getByText(
      'Request approved. The student is now a lecturer and must sign in again.',
    ),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Welcome back' }),
  ).toBeVisible();
  await login(page, email, password);
  await expect(
    page.getByRole('button', { name: 'Analytics', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Become a lecturer', exact: true }),
  ).toHaveCount(0);
  await admin.getByRole('button', { name: 'Users', exact: true }).click();
  await admin.getByLabel('Search users').fill(email);
  await admin.getByRole('button', { name: 'Search', exact: true }).click();
  const user = admin.locator('article.card').filter({
    has: admin.getByRole('heading', {
      name: 'Browser Applicant',
      exact: true,
    }),
  });
  await expect(user).toHaveCount(1);
  await user.getByText('Reset password', { exact: true }).click();
  await user
    .getByLabel('New password', { exact: true })
    .fill('AdminChangedPass34!');
  await user.getByLabel('Confirm new password').fill('AdminChangedPass34!');
  await user.getByRole('button', { name: 'Reset user password' }).click();
  await expect(
    user.getByText(
      'Password reset successfully. All sessions for this user have been signed out.',
    ),
  ).toBeVisible();
  await page.reload();
  await login(page, email, 'AdminChangedPass34!');
  await user
    .getByRole('combobox', { name: 'Account role' })
    .selectOption('student');
  await user.getByRole('button', { name: 'Save role' }).click();
  await expect(
    user.getByText('Role updated. The user must sign in again.'),
  ).toBeVisible();
  await page.reload();
  await login(page, email, 'AdminChangedPass34!');
  await expect(
    page.getByRole('button', { name: 'Become a lecturer', exact: true }),
  ).toBeVisible();
  await admin.getByRole('button', { name: 'Database', exact: true }).click();
  const row = admin
    .locator('article.database-record')
    .filter({ hasText: email });
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: 'Edit record' }).click();
  await row
    .getByRole('textbox', { name: 'Full name', exact: true })
    .fill('Edited Applicant');
  await row.getByRole('button', { name: 'Save record' }).click();
  await expect(admin.getByText('Record updated successfully.')).toBeVisible();
  await page.reload();
  await expect(page.locator('.sidebar-user')).toContainText('Edited Applicant');
  expect(
    await admin.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await context.close();
});
test('admin rejection gives the student feedback and permits a new application', async ({
  page,
  browser,
}) => {
  const email = `rejected-${test.info().project.name}-${Date.now()}@example.com`;
  await register(page, email, 'Rejected Applicant');
  await submitCv(page);
  const context = await browser.newContext({ viewport: page.viewportSize() });
  const admin = await context.newPage();
  await login(admin, 'demo-admin@example.com', 'EduQuestDemo123!');
  const card = admin.locator('article.card').filter({ hasText: email });
  await card.getByRole('button', { name: 'Reject request' }).click();
  await expect(card.getByRole('alert')).toHaveText(
    'Enter a reason for rejection.',
  );
  await card
    .getByLabel('Review note')
    .fill('Please add details about your teaching experience.');
  await card.getByRole('button', { name: 'Reject request' }).click();
  await expect(
    admin.getByText('Request rejected. The student can see your reason.'),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole('button', { name: 'Become a lecturer', exact: true })
    .click();
  await expect(
    page.getByText('Please add details about your teaching experience.', {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Send lecturer request' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Analytics', exact: true }),
  ).toHaveCount(0);
  await context.close();
});

test('private CV files cannot be served directly by the development server', async ({
  page,
}) => {
  const directory = path.resolve(
    process.env.APPLICATION_UPLOAD_DIR ||
      './private-uploads/lecturer-applications',
  );
  const files = await readdir(directory);
  expect(files.length).toBeGreaterThan(0);
  const file = path.join(directory, files[0]).replaceAll('\\', '/');
  const response = await page.request.get('/@fs/' + file);
  expect([403, 404]).toContain(response.status());
});
