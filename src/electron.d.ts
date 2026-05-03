export interface ElectronAPI {
  dbQuery: (sql: string, params?: unknown[]) => Promise<unknown[]>
  dbGet: (sql: string, params?: unknown[]) => Promise<unknown>
  dbRun: (sql: string, params?: unknown[]) => Promise<{ changes: number; lastInsertRowid: number | bigint }>
  dbBackup: () => Promise<boolean>
  dbExportJSON: () => Promise<string>
  showNotification: (title: string, body: string) => Promise<void>
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  isMaximized: () => Promise<boolean>
  openExternal: (url: string) => Promise<void>
  onMaximizeChange: (callback: (maximized: boolean) => void) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
