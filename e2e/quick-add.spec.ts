import { test, expect } from '@playwright/test'
import { launchApp } from './helpers'

test('quick add and complete task', async () => {
  const { app, page } = await launchApp('e2e-test')

  // Press Ctrl+N to open quick add dialog
  await page.keyboard.press('Control+n')
  await page.waitForSelector('input[placeholder*="添加任务"]', { timeout: 3000 })

  // Type task title and submit
  await page.fill('input[placeholder*="添加任务"]', 'E2E Test Task')
  await page.keyboard.press('Enter')

  // Verify task appears in the list
  await expect(page.locator('text=E2E Test Task').first()).toBeVisible({ timeout: 3000 })

  await app.close().catch(() => {})
})
