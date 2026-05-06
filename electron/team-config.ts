import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export interface TeamMember {
  id: string
  name: string
  color: string
}

export type TeamRole = 'server' | 'client' | ''

export interface TeamConfig {
  member: TeamMember
  role: TeamRole
  serverAddress: string
  serverPort: number
}

const INITIAL_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#84cc16', '#3b82f6', '#a855f7']
const DEFAULT_CONFIG: TeamConfig = {
  member: { id: '', name: '', color: INITIAL_COLORS[Math.floor(Math.random() * INITIAL_COLORS.length)] },
  role: '',
  serverAddress: '',
  serverPort: 5174,
}

function configPath(): string {
  return path.join(app.getPath('userData'), 'team-config.json')
}

export function readTeamConfig(): TeamConfig {
  try {
    if (fs.existsSync(configPath())) {
      const raw = JSON.parse(fs.readFileSync(configPath(), 'utf-8'))
      return { ...DEFAULT_CONFIG, ...raw }
    }
  } catch (e) {
    console.error('Failed to read team config:', e)
  }
  return { ...DEFAULT_CONFIG }
}

export function writeTeamConfig(config: Partial<TeamConfig>): void {
  const current = readTeamConfig()
  const merged = { ...current, ...config }
  fs.writeFileSync(configPath(), JSON.stringify(merged, null, 2))
}
