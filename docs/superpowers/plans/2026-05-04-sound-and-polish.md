# Sound & Animation Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 new sound effects, tune 6 animation parameters, and fix ShortcutHints z-index conflict.

**Architecture:** Sound functions use the existing `playTone()` Oscillator pattern in `useSound.ts`. Animation changes are pure parameter tuning. All changes are surgical — no new files, no restructuring.

**Tech Stack:** TypeScript, Framer Motion, Web Audio API

**Key files modified:**
- `src/hooks/useSound.ts` — 5 new sound functions
- `src/components/TaskItem.tsx` — pin/drag sounds, DragEnd handler
- `src/components/DetailPanel.tsx` — spring params
- `src/components/TaskList.tsx` — spring params + delay, empty sort hint
- `src/components/CommandPalette.tsx` — entry params
- `src/components/QuickAdd.tsx` — entry params, quick-add sound
- `src/components/Toast.tsx` — exit direction
- `src/components/EmptyState.tsx` — trophy opacity
- `src/components/DatePicker.tsx` — popup spring
- `src/components/ShortcutHints.tsx` — z-index + auto-dismiss
- `src/components/TitleBar.tsx` — quick-capture sound
- `src/store/index.ts` — undo sound

---

### Task 1: Add 5 new sound functions

**Files:**
- Modify: `src/hooks/useSound.ts`

- [ ] **Step 1: Add playPinSound**

Append after `playCelebrationSound`:

```typescript
export function playPinSound() {
  playTone(800, 0.06, 'square', 0.05)
}
```

- [ ] **Step 2: Add playDragPickupSound**

```typescript
export function playDragPickupSound() {
  playTone(300, 0.05, 'sine', 0.04)
}
```

- [ ] **Step 3: Add playDragDropSound**

```typescript
export function playDragDropSound() {
  playTone(180, 0.08, 'triangle', 0.05)
}
```

- [ ] **Step 4: Add playUndoSound**

```typescript
export function playUndoSound() {
  playTone(1100, 0.06, 'sine', 0.05)
  setTimeout(() => playTone(600, 0.08, 'sine', 0.05), 60)
}
```

- [ ] **Step 5: Add playQuickAddSound**

```typescript
export function playQuickAddSound() {
  playTone(660, 0.08, 'sine', 0.05)
}
```

- [ ] **Step 6: Verify type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useSound.ts
git commit -m "feat: add 5 new sound effects — pin, drag pickup/drop, undo, quick-add"
```

---

### Task 2: Wire sounds into components

**Files:**
- Modify: `src/store/index.ts`
- Modify: `src/components/TaskItem.tsx`
- Modify: `src/components/QuickAdd.tsx`
- Modify: `src/components/TitleBar.tsx`

- [ ] **Step 1: Wire playUndoSound in store**

In `src/store/index.ts`, add import at line 3:

```typescript
import { playCompleteSound, playDeleteSound, playUndoSound } from '@/hooks/useSound'
```

In the `undo` function (around line 343), add `playUndoSound()` before the toast:

```typescript
set({ undoStack: stack.slice(0, -1) })
await get().loadData()
playUndoSound()
// Flash the restored task
const restoredId = lastAction.task.id
```

- [ ] **Step 2: Wire playPinSound in TaskItem**

In `src/components/TaskItem.tsx`, add import:

```typescript
import { playPinSound } from '@/hooks/useSound'
```

In the Pin button's onClick (around line 175), add `playPinSound()`:

```typescript
onClick={(e) => {
  e.stopPropagation()
  togglePin(task.id)
  playPinSound()
}}
```

- [ ] **Step 3: Wire drag sounds in ReorderableTaskItem**

Add imports at top:

```typescript
import { playDragPickupSound, playDragDropSound } from '@/hooks/useSound'
```

Update Reorder.Item's onDragStart and onDragEnd:

```typescript
<Reorder.Item
  value={task}
  id={task.id}
  onDragStart={() => {
    wasDragging.current = true
    playDragPickupSound()
  }}
  onDragEnd={() => {
    setTimeout(() => { wasDragging.current = false }, 100)
    playDragDropSound()
  }}
  ...
>
```

- [ ] **Step 4: Wire playQuickAddSound in QuickAdd**

In `src/components/QuickAdd.tsx`, add import:

```typescript
import { playQuickAddSound } from '@/hooks/useSound'
```

In `handleSubmit` (around line 25), add `playQuickAddSound()` after addTask:

```typescript
await addTask(title.trim(), priority, dueDate || null, list)
playQuickAddSound()
toggleQuickAdd()
```

- [ ] **Step 5: Wire playQuickAddSound in TitleBar**

In `src/components/TitleBar.tsx`, add import:

```typescript
import { playQuickAddSound } from '@/hooks/useSound'
```

In `handleCapture` (around line 22), add `playQuickAddSound()` after addTask:

```typescript
await addTask(parsed.title, 'medium', parsed.dueDate)
playQuickAddSound()
setCaptureText('')
```

- [ ] **Step 6: Verify type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/store/index.ts src/components/TaskItem.tsx src/components/QuickAdd.tsx src/components/TitleBar.tsx
git commit -m "feat: wire new sound effects into components"
```

---

### Task 3: DetailPanel + TaskList spring tightening

**Files:**
- Modify: `src/components/DetailPanel.tsx`
- Modify: `src/components/TaskList.tsx`

- [ ] **Step 1: Tighten DetailPanel spring**

In `DetailPanel.tsx`, find the `transition` prop on `<motion.aside>` (around line 92). Change:

```typescript
transition={{ type: 'spring', stiffness: 170, damping: 26 }}
```

To:

```typescript
transition={{ type: 'spring', stiffness: 350, damping: 32 }}
```

- [ ] **Step 2: Tighten TaskList layout spring + add 50ms delay**

In `TaskList.tsx`, find the outer `<motion.div>` (around line 254). Its `transition` prop currently reads:

```typescript
transition={{ layout: { type: 'spring', stiffness: 170, damping: 26 } }}
```

Change to:

```typescript
transition={{ layout: { type: 'spring', stiffness: 350, damping: 32, delay: 0.05 } }}
```

- [ ] **Step 3: Verify type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/DetailPanel.tsx src/components/TaskList.tsx
git commit -m "fix: tighten DetailPanel+TaskList springs — reduce bounce, add 50ms delay"
```

---

### Task 4: CommandPalette + QuickAdd entry reduction

**Files:**
- Modify: `src/components/CommandPalette.tsx`
- Modify: `src/components/QuickAdd.tsx`

- [ ] **Step 1: Reduce CommandPalette entry motion**

In `CommandPalette.tsx`, find the inner panel's `<motion.div>` (around line 88-92). Change:

```typescript
initial={{ opacity: 0, y: -20, scale: 0.96 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
exit={{ opacity: 0, y: -20, scale: 0.96 }}
```

To:

```typescript
initial={{ opacity: 0, y: -12, scale: 0.98 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
exit={{ opacity: 0, y: -12, scale: 0.98 }}
```

- [ ] **Step 2: Reduce QuickAdd entry motion**

In `QuickAdd.tsx`, find the inner panel's `<motion.div>` (around line 50-53). Make the same change:

```typescript
initial={{ opacity: 0, y: -20, scale: 0.96 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
exit={{ opacity: 0, y: -20, scale: 0.96 }}
```

To:

```typescript
initial={{ opacity: 0, y: -12, scale: 0.98 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
exit={{ opacity: 0, y: -12, scale: 0.98 }}
```

- [ ] **Step 3: Verify type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/CommandPalette.tsx src/components/QuickAdd.tsx
git commit -m "fix: reduce CommandPalette/QuickAdd entry motion amplitude"
```

---

### Task 5: Toast exit + EmptyState trophy + DatePicker spring

**Files:**
- Modify: `src/components/Toast.tsx`
- Modify: `src/components/EmptyState.tsx`
- Modify: `src/components/DatePicker.tsx`

- [ ] **Step 1: Fix Toast exit direction**

In `Toast.tsx`, find the toast's `exit` prop (around line 17):

```typescript
exit={{ opacity: 0, y: -8, scale: 0.96 }}
```

Change to:

```typescript
exit={{ opacity: 0, y: 8, scale: 0.96 }}
```

- [ ] **Step 2: Reduce trophy opacity dip**

In `EmptyState.tsx`, find the trophy pulse (around line 82):

```typescript
animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
```

Change to:

```typescript
animate={{ scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }}
```

- [ ] **Step 3: Add spring to DatePicker popup**

In `DatePicker.tsx`, find the popup motion.div's transition (around line 76):

```typescript
transition={{ duration: 0.18 }}
```

Change to:

```typescript
transition={{ type: 'spring', stiffness: 400, damping: 30 }}
```

- [ ] **Step 4: Verify type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/Toast.tsx src/components/EmptyState.tsx src/components/DatePicker.tsx
git commit -m "fix: Toast exit direction + trophy opacity + DatePicker spring"
```

---

### Task 6: Manual sort empty hint + ShortcutHints bug fix

**Files:**
- Modify: `src/components/TaskList.tsx`
- Modify: `src/components/ShortcutHints.tsx`

- [ ] **Step 1: Add manual sort empty hint in TaskList**

In `TaskList.tsx`, find the section that renders `<EmptyState>` (around line 428, inside the `allTasks.length === 0` condition). After `<EmptyState view={currentView} />`, add:

```tsx
{allTasks.length === 0 && sortManual && (
  <p className="text-center text-[12px] text-text-tertiary mt-3">
    当前为手动排序模式，点击「自动排序」切换回默认排列
  </p>
)}
```

Make sure `sortManual` is in scope — it already is, as it's defined at the component level.

- [ ] **Step 2: Fix ShortcutHints z-index + auto-dismiss**

In `ShortcutHints.tsx`:

**Change 1** — Lower z-index (line 54):

```
className="fixed inset-0 z-[70] flex items-center justify-center"
```

Change to:

```
className="fixed inset-0 z-[45] flex items-center justify-center"
```

**Change 2** — Add store subscription and auto-dismiss. Add import at line 2:

```typescript
import { useStore } from '@/store'
```

Inside the component function, add hooks after `const [ctrlHeld, setCtrlHeld] = useState(false)`:

```typescript
const showCommandPalette = useStore((s) => s.showCommandPalette)
const showQuickAdd = useStore((s) => s.showQuickAdd)
```

Add a useEffect to auto-dismiss when either overlay opens:

```typescript
useEffect(() => {
  if (showCommandPalette || showQuickAdd) {
    setVisible(false)
  }
}, [showCommandPalette, showQuickAdd])
```

- [ ] **Step 3: Verify type check + run existing tests**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 4: Commit**

```bash
git add src/components/TaskList.tsx src/components/ShortcutHints.tsx
git commit -m "fix: manual sort empty hint + ShortcutHints z-index and auto-dismiss"
```

---

### Summary

After all 6 tasks:
- 5 new sound effects functioning: pin click, drag pickup/drop, undo, quick-add
- DetailPanel opens faster, less bounce; TaskList follows with 50ms delay
- CommandPalette/QuickAdd enter with subtler motion
- Toast exits downward consistently
- Trophy breathing more subtle
- DatePicker has spring pop
- Manual sort empty state shows hint
- ShortcutHints no longer blocks CommandPalette
