import { test, expect } from '@playwright/test';
const password = 'InitialPassword12!';
const changed = 'UpdatedPassword34!';
const yearTwo = [
  'Programming',
  'Database Systems',
  'Information Systems',
  'Cloud Computing',
  'Networks',
];
const yearThree = [
  'Programming',
  'Mobile App Development',
  'Operating Systems',
  'Human Computer Interaction',
  'Artificial Intelligence',
];
test('second-year registration matches Resources, previews year three, and changes password with feedback', async ({
  page,
}) => {
  const email = `password-curriculum-${test.info().project.name}-${Date.now()}@example.com`;
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('First and last name').fill('Module Student');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('combobox', { name: 'Year of study' }).selectOption('2');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  await page.getByRole('button', { name: 'Modules', exact: true }).click();
  await expect(page.locator('.module-tile h3')).toHaveText(yearTwo);
  await page.getByRole('tab', { name: 'Year 3 · next year' }).click();
  await expect(page.locator('.module-tile h3')).toHaveText(yearThree);
  await page.getByRole('button', { name: 'Resources', exact: true }).click();
  await expect(page.locator('.module-tiles button span')).toHaveText(yearTwo);
  await expect(page.getByLabel('All my modules').locator('option')).toHaveCount(
    6,
  );
  await page
    .getByLabel('All my modules')
    .selectOption({ label: 'Programming · Year 2' });
  await expect(
    page.getByText('No resources are visible for this module.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Profile', exact: true }).click();
  const form = page.locator('form.password-change');
  await form.getByLabel('Current password').fill('IncorrectPassword12!');
  await form.getByLabel('New password', { exact: true }).fill(changed);
  await form.getByLabel('Confirm new password').fill(changed);
  await form
    .getByRole('button', { name: 'Change password', exact: true })
    .click();
  await expect(form.getByRole('alert')).toHaveText(
    'Your current password is incorrect.',
  );
  await form.getByLabel('Current password').fill(password);
  await form.getByLabel('Confirm new password').fill('MismatchPassword12!');
  await form
    .getByRole('button', { name: 'Change password', exact: true })
    .click();
  await expect(form.getByRole('alert')).toHaveText(
    'New passwords do not match.',
  );
  await form.getByLabel('Confirm new password').fill(changed);
  await form
    .getByRole('button', { name: 'Change password', exact: true })
    .click();
  await expect(form.getByRole('status')).toContainText(
    'Password changed successfully.',
  );
  await expect(form.getByLabel('Current password')).toHaveValue('');
  await page.screenshot({
    path: '../password-profile-' + test.info().project.name + '.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Email or password is incorrect.',
  );
  await page.getByLabel('Password', { exact: true }).fill(changed);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
});
