import { test, expect } from '@playwright/test'
import { launchApp } from './helpers'

test('edit task and undo', async () => {
  const { app, page } = await launchApp('e2e-test')

  // Add a task first
  await page.keyboard.press('Control+n')
  await page.waitForSelector('input[placeholder*="添加任务"]', { timeout: 3000 })
  await page.fill('input[placeholder*="添加任务"]', 'Task to Edit')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)

  // Click the task to open detail panel
  await page.click('text=Task to Edit')
  await page.waitForTimeout(500)

  // Edit the title
  const titleInput = page.locator('input[value="Task to Edit"]')
  await titleInput.fill('Edited Task')
  await titleInput.press('Tab') // blur triggers save
  await page.waitForTimeout(500)

  // Verify title updated
  await expect(page.locator('text=Edited Task').first()).toBeVisible({ timeout: 3000 })

  // Undo
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(500)

  // Check undo toast
  await expect(page.locator('text=已撤销')).toBeVisible({ timeout: 3000 })

  await app.close().catch(() => {})
})
