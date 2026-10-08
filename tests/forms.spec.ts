// The forms in a real browser, with the server endpoints mocked (the Vercel functions have their own node tests).
// 1. /send: three steps, tabs and Next/Back work, step 1 is checked before moving on, no "which ending" question,
//    the right fields and the re-encoded drawing are posted, the thank-you shows.
// 2. The three email sign-ups post to /api/subscribe with their list tag, show "thank you" only on success.
import { test, expect } from '@playwright/test';
import sharp from 'sharp';

test('send form: steps, tabs, validation and submit', async ({ page }) => {
  let posted: Buffer | null = null;
  await page.route('**/api/story-card', async (route) => {
    posted = route.request().postDataBuffer();
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await page.goto('/send');
  const p1 = page.locator('#part-1'), p2 = page.locator('#part-2'), p3 = page.locator('#part-3');
  await expect(p1).toBeVisible(); await expect(p2).toBeHidden(); await expect(p3).toBeHidden();
  await expect(page.getByText('Which ending did your child choose?')).toHaveCount(0);

  // a later tab with step 1 empty: stay on step 1 and say what is missing
  await page.locator('.tn-progress__tab[data-goto="3"]').click();
  await expect(p1).toBeVisible(); await expect(p3).toBeHidden();
  await expect(page.locator('#f-email-err')).toContainText('Please write your email');
  await expect(page.locator('#f-photo-err')).toContainText('Please add a photo');

  // step 1
  await page.fill('#f-email', 'parent@example.com');
  await page.fill('#f-name', 'Noa');
  await page.selectOption('#f-age', '5');
  const png = await sharp({ create: { width: 400, height: 500, channels: 3, background: '#ffd27e' } }).png().toBuffer();
  await page.setInputFiles('#f-photo', { name: 'drawing.png', mimeType: 'image/png', buffer: png });
  await expect(page.locator('.tn-crop')).toBeVisible();
  await page.locator('#part-1 [data-goto="2"]').click();
  await expect(p2).toBeVisible(); await expect(p1).toBeHidden();
  await expect(page.locator('.tn-progress__tab[data-goto="2"]')).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('.tn-progress__tab[data-goto="1"]')).toHaveClass(/is-done/);

  // tabs go back and forward
  await page.locator('.tn-progress__tab[data-goto="1"]').click();
  await expect(p1).toBeVisible(); await expect(p2).toBeHidden();
  await page.locator('.tn-progress__tab[data-goto="2"]').click();
  await expect(p2).toBeVisible();

  // step 2: one answer, then step 3
  await page.locator('#part-2 .tn-chip-opt').first().click();
  await page.fill('#q-choice', 'Because sharing felt good.');
  await page.locator('#part-2 [data-goto="3"]').click();
  await expect(p3).toBeVisible();

  // step 3: consents are checked in words, and the answers consent is needed because step 2 has answers
  await page.locator('#part-3 button[type="submit"]').click();
  await expect(page.locator('#f-c1-err')).toContainText('parent or guardian');
  await expect(page.locator('#f-c2-err')).toContainText('first name, age and drawing');
  await expect(page.locator('#f-c3-err')).toContainText('use your answers');
  await expect(page.locator('.tn-form__thanks')).toBeHidden();
  for (const n of ['consentGuardian', 'consentCard', 'consentAnswers']) await page.locator(`input[name="${n}"]`).check();
  await page.locator('#part-3 button[type="submit"]').click();
  await expect(page.locator('.tn-form__thanks')).toBeVisible();
  await expect(p3).toBeHidden();

  const body = (posted as Buffer | null)?.toString('latin1') || '';
  expect(body).toContain('parent@example.com');
  expect(body).toContain('name="childName"');
  expect(body).toContain('name="childAge"');
  expect(body).toContain('Because sharing felt good.');
  expect(body).toMatch(/name="photo"; filename="drawing\.jpg"/);
  expect(body).toContain('Content-Type: image/jpeg');
  expect(body).not.toContain('name="ending"');
});

for (const f of [
  { path: '/', id: 'news', tag: 'news' },
  { path: '/guide', id: 'guide-pdf', tag: 'guide' },
  { path: '/teachers', id: 'teacher-pack', tag: 'teacher' },
]) {
  test(`sign-up on ${f.path} posts to /api/subscribe with the "${f.tag}" list`, async ({ page }) => {
    let posted: Record<string, string> | null = null;
    await page.route('**/api/subscribe', async (route) => {
      posted = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.goto(f.path);
    const block = page.locator(`#${f.id}`);
    await block.locator('input[type="email"]').fill('reader@example.com');
    await block.locator('button[type="submit"]').click();
    await expect(block.locator('.tn-email__thanks')).toBeVisible();
    expect(posted).toMatchObject({ form: f.tag, email: 'reader@example.com' });
  });
}

test('a failed sign-up says so, never a fake thank-you', async ({ page }) => {
  await page.route('**/api/subscribe', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false,"error":"notReady"}' }));
  await page.goto('/');
  const block = page.locator('#news');
  await block.locator('input[type="email"]').fill('reader@example.com');
  await block.locator('button[type="submit"]').click();
  await expect(block.locator('.tn-error-text')).toContainText('did not work');
  await expect(block.locator('.tn-email__thanks')).toBeHidden();
});
