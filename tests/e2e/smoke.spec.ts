import { test, expect, _electron as electron } from '@playwright/test';
import path from 'node:path';

/**
 * Smoke test that boots the packaged Electron binary, ensures the main
 * window loads, and that the sidebar renders the "Crear servidor" entry.
 *
 * Run with `npm run build && npm run test:e2e`.
 */
test('app boots and renders sidebar', async () => {
  const app = await electron.launch({
    args: [path.join(process.cwd(), 'dist', 'main', 'index.js')],
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('text=Crear servidor')).toBeVisible({ timeout: 15_000 });
  await app.close();
});
