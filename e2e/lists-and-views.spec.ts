import { test, expect } from '@playwright/test'
import { launchApp } from './helpers'

test('create list and switch views', async () => {
  const { app, page } = await launchApp('e2e-test')

  // Click "新建分类" in sidebar
  await page.click('text=新建分类')

  // Type list name and confirm
  await page.fill('input[placeholder="分类名称..."]', 'E2E List')
  await page.keyboard.press('Enter')

  // Verify list appears
  await expect(page.locator('text=E2E List').first()).toBeVisible({ timeout: 3000 })

  // Click on the new list to switch
  await page.click('text=E2E List')

  // Should show empty state
  await expect(page.locator('text=这个列表是空的')).toBeVisible({ timeout: 3000 })

  await app.close().catch(() => {})
})
