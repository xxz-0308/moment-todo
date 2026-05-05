// src/__tests__/setup.ts
import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

beforeEach(() => {
  vi.stubGlobal('electronAPI', {
    dbQuery: vi.fn().mockResolvedValue([]),
    dbRun: vi.fn().mockResolvedValue(undefined),
    dbGet: vi.fn().mockResolvedValue(null),
    dbBackup: vi.fn().mockResolvedValue(undefined),
    dbExportJSON: vi.fn().mockResolvedValue('[]'),
    teamSend: vi.fn().mockResolvedValue(undefined),
    teamStart: vi.fn().mockResolvedValue(undefined),
    teamStop: vi.fn().mockResolvedValue(undefined),
    teamGetConfig: vi.fn().mockResolvedValue({ member: null, role: 'client', serverAddress: '', serverPort: 5174 }),
    teamSaveConfig: vi.fn().mockResolvedValue(undefined),
    teamGetStatus: vi.fn().mockResolvedValue({ status: 'disabled' }),
    teamGetMembers: vi.fn().mockResolvedValue([]),
    teamRequestSync: vi.fn().mockResolvedValue(undefined),
    teamConfirmQuit: vi.fn().mockResolvedValue(true),
    onTeamEvent: vi.fn(),
    showNotification: vi.fn(),
    windowControl: vi.fn(),
    getAppVersion: vi.fn().mockResolvedValue('2.0.0'),
  })
})
