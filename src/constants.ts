// ── Protocol Version ────────────────────────────────────────
// MIN_PROTOCOL_VERSION only increments on BREAKING wire format changes.
// Breaking: removing/renaming message types, changing field types,
//   adding required fields to existing messages.
// Non-breaking: new optional message types, new optional fields,
//   UI changes, bug fixes.
// See docs/superpowers/specs/2026-05-06-protocol-versioning-design.md
export const MIN_PROTOCOL_VERSION = 1

export const PRESET_COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#84cc16', // lime
  '#3b82f6', // blue
  '#a855f7', // purple
]

export function parseAssigneeIds(assignedTo: string | null | undefined): string[] {
  if (!assignedTo) return []
  return assignedTo.split(',').map(s => s.trim()).filter(Boolean)
}

export function joinAssigneeIds(ids: string[]): string {
  return ids.join(',')
}
