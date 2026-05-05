import { test, expect } from '@playwright/test'
import { launchApp } from './helpers'

test('app launches and shows sidebar', async () => {
  const { app, page } = await launchApp('e2e-test')

  // Verify the window loaded
  const title = await page.title()
  expect(title).toBeTruthy()

  // Verify sidebar content renders (use role-based locator to avoid strict mode)
  await expect(page.getByRole('button', { name: '今天' })).toBeVisible({ timeout: 5000 })

  await app.close()
})
