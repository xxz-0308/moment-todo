import { test, expect } from '@playwright/test'
import { launchApp } from './helpers'

test('multi-select and batch delete', async () => {
  const { app, page } = await launchApp('e2e-test')

  // Add two tasks
  for (const title of ['Task One', 'Task Two']) {
    await page.keyboard.press('Control+n')
    await page.waitForSelector('input[placeholder*="添加任务"]', { timeout: 3000 })
    await page.fill('input[placeholder*="添加任务"]', title)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)
  }

  // Ctrl+click to select both
  const taskOne = page.locator('text=Task One').first()
  const taskTwo = page.locator('text=Task Two').first()

  await taskOne.click({ modifiers: ['Control'] })
  await taskTwo.click({ modifiers: ['Control'] })

  // Press Delete
  await page.keyboard.press('Delete')

  // Verify undo toast
  await expect(page.locator('text=已删除')).toBeVisible({ timeout: 3000 })

  await app.close().catch(() => {})
})
