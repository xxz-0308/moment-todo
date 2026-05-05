import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Database
  dbQuery: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:query', sql, params),
  dbGet: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:get', sql, params),
  dbRun: (sql: string, params?: unknown[]) => ipcRenderer.invoke('db:run', sql, params),
  dbBackup: () => ipcRenderer.invoke('db:backup'),
  dbExportJSON: () => ipcRenderer.invoke('db:export-json'),

  // Notifications
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('notification:show', title, body),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // Events from main
  onMaximizeChange: (callback: (maximized: boolean) => void) => {
    ipcRenderer.on('window:maximize-change', (_event, maximized) => callback(maximized))
  },

  // Team
  teamStart: (mode: string) => ipcRenderer.invoke('team:start', mode),
  teamStop: () => ipcRenderer.invoke('team:stop'),
  teamGetConfig: () => ipcRenderer.invoke('team:get-config'),
  teamSaveConfig: (config: unknown) => ipcRenderer.invoke('team:save-config', config),
  teamUpdateProfile: (member: { id: string; name: string; color: string }) => ipcRenderer.invoke('team:update-profile', member),
  teamRequestSync: () => ipcRenderer.invoke('team:request-sync'),
  teamSend: (msg: { type: string; payload: unknown }) => ipcRenderer.invoke('team:send', msg),
  teamGetStatus: () => ipcRenderer.invoke('team:get-status'),
  teamGetMembers: () => ipcRenderer.invoke('team:get-members'),
  onTeamEvent: (callback: (event: { type: string; payload: unknown }) => void) => {
    ipcRenderer.on('team:event', (_e, event) => callback(event))
  },
  onTeamQuitWarning: (callback: (data: { memberCount: number }) => void) => {
    ipcRenderer.on('team:quit-warning', (_e, data) => callback(data))
  },
  teamConfirmQuit: () => ipcRenderer.invoke('team:confirm-quit'),
})
