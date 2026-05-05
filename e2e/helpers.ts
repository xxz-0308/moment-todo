import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

function resolveElectronPath(): string {
  // On Windows, require('electron') may not resolve to the binary directly.
  // Fall back to the known electron.exe location in node_modules.
  const winExePath = path.join(
    process.cwd(),
    'node_modules',
    'electron',
    'dist',
    'electron.exe',
  )

  if (fs.existsSync(winExePath)) {
    return winExePath
  }

  // Try require('electron') as a fallback for non-Windows or alternative setups
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const electronPath = require('electron') as unknown
    if (typeof electronPath === 'string' && electronPath) {
      return electronPath
    }
  } catch {
    // ignore
  }

  throw new Error('Could not resolve electron executable path')
}

export async function launchApp(dataSuffix?: string): Promise<{ app: ElectronApplication; page: Page }> {
  const electronPath = resolveElectronPath()

  const mainEntry = path.join(process.cwd(), 'dist-electron', 'main.js')
  const args: string[] = [mainEntry]

  if (dataSuffix) {
    args.push(`--data-suffix=${dataSuffix}`)
  }

  const app = await electron.launch({
    args,
    executablePath: electronPath,
  })

  const page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
  // Wait for React to render
  await page.waitForTimeout(2000)
  return { app, page }
}
