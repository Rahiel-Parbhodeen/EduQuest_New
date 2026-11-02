import { test, expect } from '@playwright/test';
const password = 'StrongerPass12!';
test('student registers, sees curriculum, updates profile, creates a group and runs code', async ({
  page,
}) => {
  const groupName = 'Browser study ' + Date.now();
  const email = `browser-${test.info().project.name}-${Date.now()}@example.com`;
  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.getByLabel('First and last name').fill('Browser Student');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  await page.getByRole('button', { name: 'Modules', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Programming' }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Year 2 · next year' }).click();
  await expect(
    page.getByRole('heading', { name: 'Database Systems' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Profile', exact: true }).click();
  await page.getByLabel('First and last name').fill('Browser Updated');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(
    page.getByText('Profile saved.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Study groups', exact: true }).click();
  const form = page
    .getByRole('heading', { name: 'Start a study group' })
    .locator('..');
  await form
    .getByRole('combobox', { name: 'Module', exact: true })
    .selectOption({ label: 'Programming · Year 1' });
  await form.getByLabel('Group name').fill(groupName);
  await form.getByLabel('Language', { exact: true }).fill('isiZulu');
  await form.getByLabel('What are you doing now?').fill('Reviewing variables');
  await form.getByLabel('What will you do next?').fill('Practising loops');
  await form
    .getByLabel('When and where do you meet?')
    .fill('Friday at the library');
  await form.getByRole('button', { name: 'Save group' }).click();
  const groupCard = page
    .getByRole('heading', { name: groupName, exact: true })
    .locator('..');
  await expect(
    groupCard.getByText('Currently: Reviewing variables', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Language', exact: true })
    .selectOption('isiZulu');
  await expect(
    groupCard.getByText('Next: Practising loops', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Resources', exact: true }).click();
  await page.getByRole('button', { name: /EQ-IT103/ }).click();
  await expect(page.getByLabel('All my modules')).toHaveValue(/.+/);
  await page.getByRole('button', { name: 'Quizzes', exact: true }).click();
  await page.getByText('Open code playground', { exact: true }).click();
  await page.getByRole('button', { name: 'Run code' }).click();
  const preview = page.frameLocator('iframe[title="Live code result"]');
  await preview.getByRole('button', { name: 'Change message' }).click();
  await expect(
    preview.getByRole('heading', { name: 'You changed the page!' }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'HTML', exact: true })
    .fill('<h1>Live preview works</h1>');
  await page.getByRole('button', { name: 'Run code' }).click();
  await expect(
    page
      .frameLocator('iframe[title="Live code result"]')
      .getByRole('heading', { name: 'Live preview works' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: '../rebuild-' + test.info().project.name + '.png',
    fullPage: true,
  });
});
test('lecturer creates a manual quiz and generates source-grounded draft questions', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Email').fill('demo-lecturer@example.com');
  await page.getByLabel('Password').fill('EduQuestDemo123!');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  await page.getByRole('button', { name: 'Quizzes', exact: true }).click();
  await page.getByText('Create a manual quiz', { exact: true }).click();
  const form = page
    .getByRole('heading', { name: 'Create a quiz manually' })
    .locator('..');
  await form
    .getByRole('combobox', { name: 'Module', exact: true })
    .selectOption({ label: 'Database Systems' });
  await form.getByLabel('Quiz title').fill('Manual browser quiz ' + Date.now());
  await form
    .getByLabel('Question or code snippet')
    .fill('What does a primary key identify?');
  for (const [i, value] of [
    'A unique row',
    'A screen colour',
    'A page heading',
    'A font size',
  ].entries())
    await form.getByLabel('Option ' + (i + 1), { exact: true }).fill(value);
  await form.getByRole('button', { name: 'Publish manual quiz' }).click();
  await expect(form.getByRole('status')).toContainText('Quiz published.');
  await page.getByRole('button', { name: 'Resources', exact: true }).click();
  await page
    .getByLabel('All my modules')
    .selectOption({ label: 'Database Systems' });
  const resource = page.locator('.resource-generation').first();
  await resource.getByLabel('Questions', { exact: true }).fill('3');
  await resource
    .getByRole('button', { name: 'Generate quiz', exact: true })
    .click();
  await expect(
    resource.getByText('Generated draft', { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await resource
    .getByRole('button', { name: 'Publish quiz', exact: true })
    .click();
  await expect(resource.getByText('Published', { exact: true })).toBeVisible();
});
