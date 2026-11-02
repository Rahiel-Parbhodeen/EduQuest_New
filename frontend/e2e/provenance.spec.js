import { test, expect } from '@playwright/test';
test('uploaded material is previewed, used for questions and linked by supporting excerpts', async ({
  page,
}) => {
  const text =
    'Photosynthesis converts light energy into chemical energy within green plants. Chlorophyll absorbs sunlight through specialised pigments in chloroplasts. Stomata regulate gaseous exchange between leaves and their surrounding atmosphere.';
  const title = 'Uploaded biology notes ' + Date.now();
  await page.goto('/');
  await page.getByLabel('Email').fill('demo-lecturer@example.com');
  await page.getByLabel('Password').fill('EduQuestDemo123!');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.getByRole('button', { name: 'Resources', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Offline practice generator' }),
  ).toBeVisible();
  await page
    .getByLabel('All my modules')
    .selectOption({ label: 'Database Systems' });
  const form = page
    .getByRole('heading', { name: 'Upload resource' })
    .locator('..');
  await form.getByLabel('Title', { exact: true }).fill(title);
  await form.getByLabel('File', { exact: true }).setInputFiles({
    name: 'biology.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(text),
  });
  await form.getByRole('button', { name: 'Upload', exact: true }).click();
  const resource = page
    .locator('.resource-generation')
    .filter({ hasText: title });
  await expect(resource).toHaveCount(1);
  await resource.getByRole('button', { name: 'Preview uploaded text' }).click();
  await expect(resource.locator('.source-preview pre')).toHaveText(text);
  await resource.getByLabel('Questions', { exact: true }).fill('3');
  await resource
    .getByRole('button', { name: 'Generate quiz', exact: true })
    .click();
  await expect(
    resource.getByRole('heading', { name: 'Generated draft' }),
  ).toBeVisible({ timeout: 20000 });
  await expect(resource.locator('.source-evidence blockquote')).toHaveCount(3);
  const excerpts = await resource
    .locator('.source-evidence blockquote')
    .allTextContents();
  for (const excerpt of excerpts) expect(text).toContain(excerpt);
  await expect(resource.locator('.draft-questions')).not.toContainText(
    'Normalization',
  );
  await expect(resource.getByText(/source characters read/)).toBeVisible();
  await page.screenshot({
    path: '../update-provenance-' + test.info().project.name + '.png',
    fullPage: true,
  });
});
