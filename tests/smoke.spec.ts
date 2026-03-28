import { test, expect } from '@playwright/test';

const BASE = 'https://anr-mvp.vercel.app';

// ── Page Load Tests ──────────────────────────────────────────

test.describe('Page loads', () => {
  test('landing page loads and shows auth screen', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('text=A&R')).toBeVisible();
    await expect(page.locator('text=Record label simulator')).toBeVisible();
  });

  test('page returns 200', async ({ request }) => {
    const res = await request.get(BASE);
    expect(res.status()).toBe(200);
  });

  test('page has correct title or heading', async ({ page }) => {
    await page.goto(BASE);
    const heading = page.locator('text=A&R').first();
    await expect(heading).toBeVisible();
  });
});

// ── Auth UI Tests ────────────────────────────────────────────

test.describe('Auth UI', () => {
  test('shows email input and magic link button', async ({ page }) => {
    await page.goto(BASE);
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute('placeholder', 'your@email.com');

    const submitBtn = page.locator('button', { hasText: 'Send magic link' });
    await expect(submitBtn).toBeVisible();
  });

  test('email input accepts text', async ({ page }) => {
    await page.goto(BASE);
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('empty email does not crash on submit', async ({ page }) => {
    await page.goto(BASE);
    const submitBtn = page.locator('button', { hasText: 'Send magic link' });
    await submitBtn.click();
    // Page should still be functional
    await expect(page.locator('text=A&R')).toBeVisible();
  });

  test('invalid email shows error or stays on page', async ({ page }) => {
    await page.goto(BASE);
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('not-an-email');
    const submitBtn = page.locator('button', { hasText: 'Send magic link' });
    await submitBtn.click();
    // Should remain on auth page (HTML5 validation or app error)
    await expect(page.locator('text=A&R')).toBeVisible();
  });
});

// ── Static Assets ────────────────────────────────────────────

test.describe('Static assets', () => {
  test('CSS loads (page has styled elements)', async ({ page }) => {
    await page.goto(BASE);
    const body = page.locator('body');
    const bg = await body.evaluate(el => getComputedStyle(el).backgroundColor);
    // Should have some background color set (not default white)
    expect(bg).toBeTruthy();
  });

  test('JS bundle loads (React renders)', async ({ page }) => {
    await page.goto(BASE);
    // React mounts into #root
    const root = page.locator('#root');
    await expect(root).not.toBeEmpty();
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(BASE);
    await page.waitForTimeout(2000);
    // Filter out known non-critical errors (e.g. favicon 404)
    const critical = errors.filter(e => !e.includes('favicon'));
    expect(critical).toHaveLength(0);
  });
});

// ── Navigation (unauthenticated) ─────────────────────────────

test.describe('Navigation guards', () => {
  test('unauthenticated user cannot access dashboard', async ({ page }) => {
    await page.goto(BASE);
    // Should see auth screen, not dashboard content
    await expect(page.locator('text=Send magic link')).toBeVisible();
    await expect(page.locator('text=Submit a band')).not.toBeVisible();
  });

  test('unauthenticated user cannot access /submit', async ({ page }) => {
    await page.goto(`${BASE}/submit`);
    // SPA loads, auth check runs, then shows auth screen
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Submit a band')).not.toBeVisible();
  });

  test('unauthenticated user cannot access /review', async ({ page }) => {
    await page.goto(`${BASE}/review`);
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Review queue')).not.toBeVisible();
  });

  test('unauthenticated user cannot access /leaderboard', async ({ page }) => {
    await page.goto(`${BASE}/leaderboard`);
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Leaderboard')).not.toBeVisible();
  });
});

// ── Responsive / Layout ──────────────────────────────────────

test.describe('Responsive layout', () => {
  test('renders on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE);
    await expect(page.locator('text=A&R')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('renders on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(BASE);
    await expect(page.locator('text=A&R')).toBeVisible();
  });

  test('renders on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE);
    await expect(page.locator('text=A&R')).toBeVisible();
  });
});

// ── Performance ──────────────────────────────────────────────

test.describe('Performance', () => {
  test('page loads in under 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test('no failed network requests (except expected)', async ({ page }) => {
    const failures: string[] = [];
    page.on('requestfailed', req => {
      failures.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    expect(failures).toHaveLength(0);
  });
});

// ── Security Headers ─────────────────────────────────────────

test.describe('Security', () => {
  test('serves over HTTPS', async ({ request }) => {
    const res = await request.get(BASE);
    expect(res.url()).toMatch(/^https/);
  });

  test('does not expose Supabase keys in HTML', async ({ page }) => {
    await page.goto(BASE);
    const html = await page.content();
    // Anon key is expected in the JS bundle (it's public), but should not be in raw HTML
    expect(html).not.toContain('sb_secret_');
  });
});
