import { test, expect } from '@playwright/test'
import { launchApp } from './helpers'

test('search tasks', async () => {
  const { app, page } = await launchApp('e2e-test')

  // Add a task with unique name
  await page.keyboard.press('Control+n')
  await page.waitForSelector('input[placeholder*="添加任务"]', { timeout: 3000 })
  await page.fill('input[placeholder*="添加任务"]', 'Buy groceries')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)

  // Open search
  await page.keyboard.press('Control+k')
  await page.waitForSelector('input[placeholder*="搜索"]', { timeout: 3000 })

  // Type search
  await page.fill('input[placeholder*="搜索"]', 'groceries')

  // Verify result
  await expect(page.locator('text=Buy groceries').first()).toBeVisible({ timeout: 3000 })

  await app.close().catch(() => {})
})
