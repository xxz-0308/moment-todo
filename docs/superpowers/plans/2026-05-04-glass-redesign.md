# Glass Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply Glassmorphism visual overhaul + micro-interactions across all Moment todo app components.

**Architecture:** Pure CSS + component-level style/animation changes. No new dependencies. New CSS variables in `index.css` define a 4-layer glass material system (L0底板 → L1面板 → L2浮层 → L3强调). Components consume these tokens. Light mode gets parallel glass values.

**Tech Stack:** React 19, Tailwind CSS 3, Framer Motion 11, TypeScript, Vite

**Key files modified:**
- `src/index.css` — glass tokens, dark + light
- `src/components/*.tsx` — all 13 component files

---

### Task 1: Add glass CSS variables (`src/index.css`)

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add glass token variables to `:root`**

Add after `--color-warning` line (line 23):

```css
  /* Glass material system — dark */
  --glass-bg: rgba(22, 22, 38, 0.7);
  --glass-border: rgba(255, 255, 255, 0.06);
  --glass-blur: blur(20px);
  --glass-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  --glass-elevated-bg: rgba(28, 28, 48, 0.85);
  --glass-elevated-border: rgba(255, 255, 255, 0.1);
  --glass-elevated-blur: blur(32px);
  --glass-elevated-shadow: 0 16px 64px rgba(0, 0, 0, 0.6);
  --glass-accent-bg: rgba(99, 102, 241, 0.08);
  --glass-accent-border: rgba(99, 102, 241, 0.2);
  --glow-accent: 0 0 16px rgba(99, 102, 241, 0.12);
  --glow-danger: 0 0 12px rgba(239, 68, 68, 0.15);
  --glow-success: 0 0 12px rgba(16, 185, 129, 0.12);
```

- [ ] **Step 2: Add L0 background gradient style**

Add after `body { ... }` block:

```css
.bg-surface-gradient {
  background: linear-gradient(135deg, #0a0a10 0%, #0f0f18 50%, #0a0a15 100%);
}
```

- [ ] **Step 3: Add glass utility classes**

Add at end of file:

```css
/* Glass utility classes */
.glass-panel {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  box-shadow: var(--glass-shadow);
}

.glass-elevated {
  background: var(--glass-elevated-bg);
  border: 1px solid var(--glass-elevated-border);
  backdrop-filter: var(--glass-elevated-blur);
  -webkit-backdrop-filter: var(--glass-elevated-blur);
  box-shadow: var(--glass-elevated-shadow);
}

.glass-accent {
  background: var(--glass-accent-bg);
  border: 1px solid var(--glass-accent-border);
  box-shadow: var(--glow-accent);
}

.glass-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  transition: transform 0.15s ease-out, box-shadow 0.15s ease-out, border-color 0.15s ease-out;
}

.glass-card:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}

.glass-input {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.glass-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  outline: none;
}

/* Backdrop overlay for modals */
.backdrop-blur-overlay {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
```

- [ ] **Step 4: Verify dev server compiles**

```bash
npm run dev
```

Check the app loads without errors, then kill the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat: add glass CSS variables and utility classes"
```

---

### Task 2: Update `:root` base colors for deeper glass feel

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Adjust surface colors to support glass layers**

In `:root`, update the surface colors to be slightly deeper/bluer to create contrast with glass panels:

```css
:root {
  /* Dark theme (default) */
  --color-surface: #0a0a10;
  --color-surface-secondary: #0f0f18;
  --color-surface-tertiary: #1a1a28;
  --color-surface-hover: rgba(255, 255, 255, 0.04);
  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-subtle: rgba(255, 255, 255, 0.04);
  --color-text-primary: #f0f0f0;
  --color-text-secondary: rgba(255, 255, 255, 0.55);
  --color-text-tertiary: rgba(255, 255, 255, 0.3);
  --color-accent: #6366f1;
  --color-accent-hover: #818cf8;
  --color-accent-muted: rgba(99, 102, 241, 0.12);
  --color-danger: #ef4444;
  --color-danger-hover: #f87171;
  --color-danger-muted: rgba(239, 68, 68, 0.1);
  --color-success: #10b981;
  --color-warning: #f59e0b;

  color-scheme: dark;
}
```

- [ ] **Step 2: Update `:root.light` placeholder colors**

Keep light mode for now but prepare better base:

```css
:root.light {
  --color-surface: #f5f5f7;
  --color-surface-secondary: #eeeeef;
  --color-surface-tertiary: #e4e4e6;
  --color-surface-hover: rgba(0, 0, 0, 0.04);
  --color-border: rgba(0, 0, 0, 0.1);
  --color-border-subtle: rgba(0, 0, 0, 0.06);
  --color-text-primary: #1a1a1a;
  --color-text-secondary: rgba(0, 0, 0, 0.55);
  --color-text-tertiary: rgba(0, 0, 0, 0.35);
  --color-accent: #6366f1;
  --color-accent-hover: #4f46e5;
  --color-accent-muted: rgba(99, 102, 241, 0.08);
  --color-danger: #ef4444;
  --color-danger-hover: #dc2626;
  --color-danger-muted: rgba(239, 68, 68, 0.08);
  --color-success: #10b981;
  --color-warning: #f59e0b;

  color-scheme: light;
}
```

- [ ] **Step 3: Update custom scrollbar colors**

Update scrollbar thumb to be more subtle:

```css
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
```

- [ ] **Step 4: Verify dev server compiles**

```bash
npm run dev
```

Confirm no visual regressions on dark mode. Kill server.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat: deepen base colors for glass material contrast"
```

---

### Task 3: TitleBar glass polish

**Files:**
- Modify: `src/components/TitleBar.tsx`

- [ ] **Step 1: Change TitleBar background to blend with gradient**

Replace the root div className (line 33):

```tsx
<div className="drag-region h-11 flex items-center justify-between px-4 border-b border-border-subtle flex-shrink-0 bg-surface-gradient">
```

The change: remove `bg-surface-secondary`, add `bg-surface-gradient`.

- [ ] **Step 2: Add glass hover rings to window control buttons**

Update the minimize button (line 89-93):

```tsx
<button
  onClick={() => window.electronAPI?.minimizeWindow()}
  className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-hover hover:shadow-[0_0_12px_rgba(255,255,255,0.05)] transition-all"
>
```

Update the maximize button (line 95-98):

```tsx
<button
  onClick={() => window.electronAPI?.maximizeWindow()}
  className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-hover hover:shadow-[0_0_12px_rgba(255,255,255,0.05)] transition-all"
>
```

Update the close button (line 105-107):

```tsx
<button
  onClick={() => window.electronAPI?.closeWindow()}
  className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-white hover:bg-danger hover:shadow-[0_0_16px_rgba(239,68,68,0.25)] transition-all"
>
```

- [ ] **Step 3: Verify visually**

```bash
npm run dev
```

Check TitleBar blends with background, buttons have subtle glow on hover. Kill server.

- [ ] **Step 4: Commit**

```bash
git add src/components/TitleBar.tsx
git commit -m "feat: TitleBar glass blend + button hover glow"
```

---

### Task 4: Sidebar glass panel + nav indicator

**Files:**
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Change Sidebar container to glass panel**

Replace the `<aside>` className (line 78):

```tsx
<aside className="w-[260px] flex-shrink-0 flex flex-col overflow-hidden border-r border-border-subtle bg-[rgba(22,22,38,0.7)] backdrop-blur-xl" style={{ boxShadow: '4px 0 32px rgba(0,0,0,0.4)' }}>
```

- [ ] **Step 2: Update preset nav item active state — add left indicator bar**

Replace the preset nav button className (lines 90-97):

```tsx
className={`
  w-full flex items-center gap-3 pl-2.5 pr-3 py-2 rounded-lg text-[13px] font-medium
  transition-all duration-150 relative overflow-hidden
  ${isActive
    ? 'text-text-primary bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] shadow-[0_0_16px_rgba(99,102,241,0.08)]'
    : 'text-text-secondary hover:text-text-primary hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
  }
`}
```

And add the left indicator inside the button, before the Icon:

```tsx
{isActive && (
  <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-accent shadow-[0_0_6px_rgba(99,102,241,0.4)]" />
)}
```

- [ ] **Step 3: Update Today progress ring — add glow**

In the SVG circle for today progress (line 103-117), add a `filter`:

```tsx
<svg width="22" height="22" viewBox="0 0 22 22" className="flex-shrink-0" style={{ filter: 'drop-shadow(0 0 3px rgba(99,102,241,0.3))' }}>
```

- [ ] **Step 4: Update custom list items to same active style**

Replace the custom list button className (lines 161-169):

```tsx
className={`
  w-full flex items-center gap-3 pl-2.5 pr-3 py-2 rounded-lg text-[13px] font-medium
  transition-all duration-150 relative overflow-hidden
  ${isActive || dragOverList === list.id
    ? 'text-text-primary bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] shadow-[0_0_16px_rgba(99,102,241,0.08)]'
    : 'text-text-secondary hover:text-text-primary hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
  }
  ${dragOverList === list.id ? 'ring-1 ring-accent scale-[1.02]' : ''}
`}
```

And add the left indicator inside the button:

```tsx
{isActive && (
  <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-accent shadow-[0_0_6px_rgba(99,102,241,0.4)]" />
)}
```

- [ ] **Step 5: Update divider lines to be more subtle**

Replace the divider (line 132):

```tsx
<div className="mx-4 h-px bg-[rgba(255,255,255,0.04)]" />
```

Replace the bottom border (line 247):

```tsx
<div className="p-3 border-t border-[rgba(255,255,255,0.04)] space-y-0.5">
```

- [ ] **Step 6: Update "列表" label color**

Line 137, replace `text-text-tertiary` with inline style:

```tsx
<span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>
```

- [ ] **Step 7: Verify visually**

```bash
npm run dev
```

Check sidebar glass effect, active indicator, hover states. Kill server.

- [ ] **Step 8: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: Sidebar glass panel with left-bar active indicator + glow"
```

---

### Task 5: TaskItem glass cards + micro-interactions

**Files:**
- Modify: `src/components/TaskItem.tsx`

- [ ] **Step 1: Replace TaskItem container with glass card style**

Replace the `<motion.div>` className (lines 93-101):

```tsx
<motion.div
  layout
  transition={{ layout: { type: 'spring', stiffness: 500, damping: 35 } }}
  animate={{
    opacity: 1,
    backgroundColor: flashHighlight
      ? ['rgba(99,102,241,0.25)', 'rgba(99,102,241,0)']
      : undefined,
    transition: flashHighlight ? { duration: 0.8, ease: 'easeOut' } : undefined,
  }}
  whileHover={{
    y: -1,
    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    borderColor: 'rgba(255,255,255,0.08)',
    transition: { duration: 0.15 },
  }}
  draggable
  ref={(el) => {
    if (el) {
      el.ondragstart = (e: DragEvent) => {
        e.dataTransfer!.setData('text/plain', task.id)
        e.dataTransfer!.effectAllowed = 'move'
      }
    }
  }}
  className={`
    task-item group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer
    relative overflow-hidden
    bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]
    ${isSelected
      ? '!bg-[rgba(99,102,241,0.08)] !border-[rgba(99,102,241,0.2)] shadow-[0_0_16px_rgba(99,102,241,0.08)]'
      : ''
    }
    ${task.completed ? 'opacity-40' : ''}
    ${isMultiSelected ? 'ring-1 ring-accent bg-[rgba(99,102,241,0.08)]' : ''}
  `}
```

Note: `transition` prop on `whileHover` uses Framer Motion's built-in transition. For the CSS class transitions, the `glass-card` styles in `index.css` already handle border/shadow transitions.

- [ ] **Step 2: Add Pin button bounce animation**

Replace the Pin button onClick (lines 154-167):

```tsx
<button
  onClick={(e) => {
    e.stopPropagation()
    togglePin(task.id)
  }}
  className={`
    flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md transition-all duration-150
    ${task.pinned
      ? 'text-accent opacity-100 hover:bg-accent-muted'
      : 'text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-accent hover:bg-accent-muted'
    }
  `}
>
  <motion.span
    whileTap={{ scale: 0.85 }}
    animate={!!task.pinned ? { scale: [1, 1.2, 1] } : {}}
    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
  >
    <Pin size={13} strokeWidth={2.5} fill={!!task.pinned ? 'currentColor' : 'none'} />
  </motion.span>
</button>
```

- [ ] **Step 3: Enhance overdue date badge glow**

Replace the date badge span (lines 216-229):

```tsx
{hasDueDate && !showCompletedState && (
  <span
    className={`
      flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md flex-shrink-0 transition-shadow
      ${overdue
        ? 'bg-[rgba(239,68,68,0.12)] text-danger shadow-[0_0_8px_rgba(239,68,68,0.15)]'
        : approaching
          ? 'bg-[rgba(245,158,11,0.12)] text-[var(--color-warning)] shadow-[0_0_6px_rgba(245,158,11,0.12)] animate-pulse'
          : 'bg-[rgba(255,255,255,0.04)] text-text-tertiary group-hover:text-text-secondary'
      }
    `}
  >
    <Calendar size={11} strokeWidth={2} />
    {formatDueDate(task.due_date)}
  </span>
)}
```

- [ ] **Step 4: Enhance delete button with danger glow**

Replace the delete button (lines 244-252):

```tsx
<button
  onClick={(e) => {
    e.stopPropagation()
    removeTask(task.id)
  }}
  className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-text-tertiary hover:text-danger hover:bg-[rgba(239,68,68,0.12)] hover:shadow-[0_0_10px_rgba(239,68,68,0.15)] opacity-0 group-hover:opacity-100 transition-all"
>
  <Trash2 size={13} strokeWidth={1.8} />
</button>
```

- [ ] **Step 5: Update complete green flash overlay to sweep effect**

Replace the `justCompleted` overlay (lines 114-125):

```tsx
<AnimatePresence>
  {justCompleted && (
    <motion.div
      initial={{ x: '-100%', opacity: 0 }}
      animate={{ x: '100%', opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="absolute inset-0 rounded-xl pointer-events-none"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.12) 40%, rgba(16,185,129,0.08) 60%, transparent 100%)',
      }}
    />
  )}
</AnimatePresence>
```

- [ ] **Step 6: Verify visually — check hover lift, complete sweep, delete glow**

```bash
npm run dev
```

Test: hover tasks (should lift), complete a task (green sweep), hover delete button (red glow). Kill server.

- [ ] **Step 7: Commit**

```bash
git add src/components/TaskItem.tsx
git commit -m "feat: TaskItem glass cards + hover lift + complete sweep + glow badges"
```

---

### Task 6: TaskList background + filter chips

**Files:**
- Modify: `src/components/TaskList.tsx`

- [ ] **Step 1: Apply gradient background to TaskList container**

Replace the outer `<motion.div>` className (lines 254-257):

```tsx
<motion.div
  layout
  transition={{ layout: { type: 'spring', stiffness: 170, damping: 26 } }}
  className="flex-1 flex flex-col min-w-0 bg-surface-gradient"
>
```

- [ ] **Step 2: Update quick-add input to glass style**

Replace the quick-add input container (lines 279-280):

```tsx
<div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] focus-within:border-accent/40 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.08)] transition-all">
```

- [ ] **Step 3: Update filter chips to glass accent style**

Replace the filter chip button className (lines 362-370):

```tsx
className={`
  px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all
  ${activeFilter === chip.id
    ? 'bg-[rgba(99,102,241,0.1)] text-accent border border-[rgba(99,102,241,0.2)] shadow-[0_0_10px_rgba(99,102,241,0.08)]'
    : 'bg-[rgba(255,255,255,0.03)] text-text-tertiary hover:text-text-secondary hover:bg-[rgba(255,255,255,0.05)] border border-transparent'
  }
`}
```

- [ ] **Step 4: Update batch action bar to glass**

Replace the batch action bar container (lines 386):

```tsx
<div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] shadow-[0_0_12px_rgba(99,102,241,0.06)]">
```

- [ ] **Step 5: Update overdue section divider**

Replace the overdue divider (lines 436-441):

```tsx
<div className="flex items-center gap-2 my-3 px-1">
  <div className="flex-1 h-px bg-[rgba(255,255,255,0.04)]" />
  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>
    逾期 · {sortedOverdue.length}
  </span>
  <div className="flex-1 h-px bg-[rgba(255,255,255,0.04)]" />
</div>
```

- [ ] **Step 6: Verify visually**

```bash
npm run dev
```

Check: gradient background, glass quick-add input, filter chips. Kill server.

- [ ] **Step 7: Commit**

```bash
git add src/components/TaskList.tsx
git commit -m "feat: TaskList gradient bg + glass input + glass filter chips"
```

---

### Task 7: DetailPanel glass

**Files:**
- Modify: `src/components/DetailPanel.tsx`

- [ ] **Step 1: Change DetailPanel to glass panel**

Replace the `<motion.aside>` className (lines 88-93):

```tsx
<motion.aside
  initial={{ x: '100%', opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: '100%', opacity: 0 }}
  transition={{ type: 'spring', stiffness: 170, damping: 26 }}
  className="w-[320px] flex-shrink-0 flex flex-col overflow-hidden border-l border-[rgba(255,255,255,0.06)]"
  style={{
    background: 'rgba(22,22,38,0.75)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    boxShadow: '-4px 0 32px rgba(0,0,0,0.4)',
  }}
>
```

- [ ] **Step 2: Update header divider to subtle**

Replace header div className (line 96):

```tsx
<div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.05)]">
```

- [ ] **Step 3: Update input/select/textarea focus styles to glass-input**

Replace the title input className (lines 136-140):

```tsx
className={`
  flex-1 bg-transparent text-[15px] font-medium text-text-primary outline-none
  border-b border-transparent hover:border-border focus:border-accent transition-colors pb-1
  focus:shadow-[0_1px_0_0_rgba(99,102,241,0.3)]
  ${selectedTask.completed ? 'line-through text-text-tertiary' : ''}
`}
```

Replace the select className (line 196):

```tsx
className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] text-[13px] text-text-primary outline-none border border-[rgba(255,255,255,0.06)] focus:border-accent focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all appearance-none cursor-pointer"
```

Replace the textarea className (lines 212-218):

```tsx
className="w-full px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] text-[13px] text-text-primary placeholder-text-tertiary outline-none border border-[rgba(255,255,255,0.06)] focus:border-accent focus:shadow-[0_0_0_3px_rgba(99,102,241,0.1)] transition-all resize-none"
```

- [ ] **Step 4: Update footer divider + delete button**

Replace the footer div className (line 224):

```tsx
<div className="p-4 border-t border-[rgba(255,255,255,0.05)]">
```

Replace the delete button className (lines 226-228):

```tsx
className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium text-danger hover:bg-[rgba(239,68,68,0.1)] hover:shadow-[0_0_16px_rgba(239,68,68,0.12)] transition-all"
```

- [ ] **Step 5: Verify visually**

```bash
npm run dev
```

Select a task, check glass panel slides in, inputs glow on focus, delete button has red halo. Kill server.

- [ ] **Step 6: Commit**

```bash
git add src/components/DetailPanel.tsx
git commit -m "feat: DetailPanel glass panel + input focus glow + delete halo"
```

---

### Task 8: CommandPalette glass

**Files:**
- Modify: `src/components/CommandPalette.tsx`

- [ ] **Step 1: Update overlay background to include blur**

Replace the overlay className (lines 75-76):

```tsx
className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
style={{
  background: 'rgba(0,0,0,0.45)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
}}
```

- [ ] **Step 2: Update panel to L2 elevated glass**

Replace the inner panel className (lines 84-89):

```tsx
className="w-[480px] rounded-2xl overflow-hidden"
style={{
  background: 'rgba(28,28,48,0.9)',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 16px 64px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.05) inset',
}}
```

- [ ] **Step 3: Update search input divider to subtle**

Replace the search container className (line 92):

```tsx
<div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgba(255,255,255,0.06)]">
```

- [ ] **Step 4: Update result item hover to L3 accent**

Replace the result button className (lines 121-127):

```tsx
className={`
  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group/item relative
  ${index === selectedIndex
    ? 'bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] shadow-[0_0_12px_rgba(99,102,241,0.06)]'
    : 'hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
  }
`}
```

And add a left indicator for selected item before the Hash icon:

```tsx
{index === selectedIndex && (
  <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-accent shadow-[0_0_6px_rgba(99,102,241,0.4)]" />
)}
```

- [ ] **Step 5: Update footer to subtle**

Replace the footer className (line 151):

```tsx
<div className="flex items-center gap-4 px-4 py-2.5 border-t border-[rgba(255,255,255,0.05)] text-[11px] text-text-tertiary">
```

- [ ] **Step 6: Verify visually**

```bash
npm run dev
```

Press Ctrl+K, check glass backdrop blur + elevated panel. Arrow-key navigate, check selected indicator. Kill server.

- [ ] **Step 7: Commit**

```bash
git add src/components/CommandPalette.tsx
git commit -m "feat: CommandPalette L2 elevated glass + backdrop blur + nav indicator"
```

---

### Task 9: QuickAdd glass

**Files:**
- Modify: `src/components/QuickAdd.tsx`

- [ ] **Step 1: Update overlay background to include blur**

Replace the overlay className (lines 40):

```tsx
className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
style={{
  background: 'rgba(0,0,0,0.45)',
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
}}
```

- [ ] **Step 2: Update panel to L2 elevated glass**

Replace the inner panel className (lines 46-51):

```tsx
className="w-[420px] rounded-2xl overflow-hidden"
style={{
  background: 'rgba(28,28,48,0.9)',
  backdropFilter: 'blur(32px)',
  WebkitBackdropFilter: 'blur(32px)',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 16px 64px rgba(0,0,0,0.6)',
}}
```

- [ ] **Step 3: Update title input section**

Replace the title input container className (line 54):

```tsx
<div className="flex items-center gap-3 px-4 py-4 border-b border-[rgba(255,255,255,0.05)]">
```

- [ ] **Step 4: Update footer**

Replace footer className (line 155):

```tsx
<div className="flex items-center justify-between px-4 py-3 border-t border-[rgba(255,255,255,0.05)]">
```

- [ ] **Step 5: Verify visually**

```bash
npm run dev
```

Press Ctrl+N, check glass panel with backdrop blur. Kill server.

- [ ] **Step 6: Commit**

```bash
git add src/components/QuickAdd.tsx
git commit -m "feat: QuickAdd L2 elevated glass + backdrop blur overlay"
```

---

### Task 10: Settings glass

**Files:**
- Modify: `src/components/Settings.tsx`

- [ ] **Step 1: Add gradient background to Settings page**

Replace the outer div className (lines 41):

```tsx
className="fixed inset-0 z-40 flex flex-col bg-surface-gradient"
```

- [ ] **Step 2: Update header divider**

Replace the header div className (line 45):

```tsx
<div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.05)]">
```

- [ ] **Step 3: Update theme toggle cards to glass**

Replace the theme button common className parts. For the dark mode button (lines 68-73):

```tsx
className={`
  flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all
  ${theme === 'dark'
    ? 'bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] shadow-[0_0_12px_rgba(99,102,241,0.06)]'
    : 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.03)]'
  }
`}
```

For the light mode button (lines 86-91):

```tsx
className={`
  flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all
  ${theme === 'light'
    ? 'bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] shadow-[0_0_12px_rgba(99,102,241,0.06)]'
    : 'bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.03)]'
  }
`}
```

- [ ] **Step 4: Update data action cards**

Replace the backup button className (lines 113-114):

```tsx
className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.04)] transition-all"
```

Replace the export button className (lines 123-124):

```tsx
className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.04)] transition-all"
```

- [ ] **Step 5: Verify visually**

```bash
npm run dev
```

Open Settings, check gradient bg + glass cards + theme toggle glow. Kill server.

- [ ] **Step 6: Commit**

```bash
git add src/components/Settings.tsx
git commit -m "feat: Settings gradient bg + glass cards + theme toggle glow"
```

---

### Task 11: Stats glass

**Files:**
- Modify: `src/components/Stats.tsx`

- [ ] **Step 1: Add gradient background to Stats page**

Replace the outer div className (lines 55):

```tsx
className="fixed inset-0 z-40 flex flex-col bg-surface-gradient"
```

- [ ] **Step 2: Update header divider**

Replace the header div className (line 59):

```tsx
<div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.05)]">
```

- [ ] **Step 3: Update summary cards to glass**

Replace the summary card className (lines 88):

```tsx
className="p-4 rounded-xl"
style={{
  backgroundColor: card.bg,
  border: '1px solid rgba(255,255,255,0.06)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
}}
```

- [ ] **Step 4: Update chart containers to glass**

Replace the bar chart container className (line 105):

```tsx
<div className="p-5 rounded-xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
```

Replace the pie chart container className (line 149):

```tsx
<div className="p-5 rounded-xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
```

- [ ] **Step 5: Verify visually**

```bash
npm run dev
```

Open Stats, check gradient bg + glass summary cards + glass chart containers. Kill server.

- [ ] **Step 6: Commit**

```bash
git add src/components/Stats.tsx
git commit -m "feat: Stats gradient bg + glass cards + glass chart containers"
```

---

### Task 12: EmptyState glass

**Files:**
- Modify: `src/components/EmptyState.tsx`

- [ ] **Step 1: Update greeting icon container to glass accent**

In the greeting section (line 153-158), replace the icon container:

```tsx
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.1 }}
  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
  style={{
    background: 'rgba(99,102,241,0.08)',
    border: '1px solid rgba(99,102,241,0.15)',
    boxShadow: '0 8px 32px rgba(99,102,241,0.08)',
  }}
>
```

- [ ] **Step 2: Update trophy celebration container**

Replace the trophy container (lines 70-74):

```tsx
<motion.div
  initial={{ scale: 0, rotate: -180 }}
  animate={{ scale: 1, rotate: 0 }}
  transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
  className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
  style={{
    background: 'rgba(99,102,241,0.1)',
    border: '1px solid rgba(99,102,241,0.2)',
    boxShadow: '0 0 32px rgba(99,102,241,0.1)',
  }}
>
```

And enhance the trophy pulse animation (lines 76-79):

```tsx
<motion.div
  animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
>
```

- [ ] **Step 3: Update the list-empty state icon container**

Replace the generic empty icon container (lines 112-117):

```tsx
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.1 }}
  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
  style={{
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
  }}
>
```

- [ ] **Step 4: Verify visually**

```bash
npm run dev
```

Check empty state views: today empty, list empty, today all done. Kill server.

- [ ] **Step 5: Commit**

```bash
git add src/components/EmptyState.tsx
git commit -m "feat: EmptyState glass icon containers + trophy glow"
```

---

### Task 13: Toast glass

**Files:**
- Modify: `src/components/Toast.tsx`

- [ ] **Step 1: Update toast container to L2 glass**

Replace the toast motion.div className (lines 19):

```tsx
className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl"
style={{
  background: 'rgba(28,28,48,0.9)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
}}
```

Remove the inline `boxShadow` style on line 20-22.

- [ ] **Step 2: Verify visually**

```bash
npm run dev
```

Complete or delete a task, check toast is glass. Kill server.

- [ ] **Step 3: Commit**

```bash
git add src/components/Toast.tsx
git commit -m "feat: Toast L2 elevated glass container"
```

---

### Task 14: Light mode glass variables

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add light mode glass variables to `:root.light`**

Add after the existing `--color-warning` line in `:root.light`:

```css
  /* Glass material system — light */
  --glass-bg: rgba(255, 255, 255, 0.6);
  --glass-border: rgba(0, 0, 0, 0.06);
  --glass-blur: blur(20px);
  --glass-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  --glass-elevated-bg: rgba(255, 255, 255, 0.8);
  --glass-elevated-border: rgba(0, 0, 0, 0.1);
  --glass-elevated-blur: blur(32px);
  --glass-elevated-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
  --glass-accent-bg: rgba(99, 102, 241, 0.06);
  --glass-accent-border: rgba(99, 102, 241, 0.2);
  --glow-accent: 0 0 16px rgba(99, 102, 241, 0.08);
  --glow-danger: 0 0 12px rgba(239, 68, 68, 0.1);
  --glow-success: 0 0 12px rgba(16, 185, 129, 0.08);
```

- [ ] **Step 2: Update `bg-surface-gradient` for light mode**

Add inside `:root.light` (via a new rule):

```css
:root.light .bg-surface-gradient {
  background: linear-gradient(135deg, #f5f5f7 0%, #fafafa 50%, #f0f0f2 100%);
}
```

- [ ] **Step 3: Update light mode scrollbar**

Add:

```css
:root.light ::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
}

:root.light ::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}
```

- [ ] **Step 4: Verify both themes**

```bash
npm run dev
```

Toggle light/dark (Ctrl+Shift+T), check glass effects in both modes. Kill server.

- [ ] **Step 5: Commit**

```bash
git add src/index.css
git commit -m "feat: light mode glass variables + gradient + scrollbar"
```

---

### Task 15: Global micro-interactions final pass

**Files:**
- Modify: `src/components/TaskItem.tsx`
- Modify: `src/components/Sidebar.tsx`

- [ ] **Step 1: Add stagger entry animation to TaskItem**

In `TaskItem.tsx`, add to the `<motion.div>` animation props:

```tsx
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
```

Already has `layout` and whileHover — just add `initial`/`animate` for entry.

- [ ] **Step 2: Add whileTap to complete circle**

Update the complete circle button (lines 171-201), replace the existing `whileHover`/`whileTap`:

```tsx
{task.completed ? (
  <motion.span
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
  >
    <CheckCircle2 size={20} strokeWidth={2} className="text-accent drop-shadow-[0_0_4px_rgba(99,102,241,0.3)]" />
  </motion.span>
) : (
  <motion.span
    whileHover={{ scale: 1.15 }}
    whileTap={{ scale: 0.85 }}
  >
    <Circle
      size={20}
      strokeWidth={1.8}
      className={`
        transition-colors duration-150
        ${overdue ? 'text-danger' : 'text-text-tertiary hover:text-accent'}
      `}
    />
  </motion.span>
)}
```

- [ ] **Step 3: Add whileTap to Sidebar nav buttons**

In `Sidebar.tsx`, the existing `whileTap={{ scale: 0.98 }}` is already on the preset nav buttons. Keep it.

- [ ] **Step 4: Run type check + quick smoke test**

```bash
npx tsc --noEmit && npm test
```

- [ ] **Step 5: Final visual review**

```bash
npm run dev
```

Walk through all areas: TitleBar, Sidebar navigation, create/complete/delete tasks, open CommandPalette, QuickAdd, DetailPanel, Settings, Stats, check empty states, toggle light/dark.

- [ ] **Step 6: Commit**

```bash
git add src/components/TaskItem.tsx
git commit -m "feat: stagger entry + checkmark glow + tap feedback — final micro-interaction pass"
```

---

### Summary

After all 15 tasks, the app will have:
- 4-layer glass material system in CSS
- L0 gradient backgrounds on main content, Settings, Stats
- L1 glass panels on Sidebar, DetailPanel
- L2 elevated glass on CommandPalette, QuickAdd, Toast
- L3 accent emphasis on active nav items, selected tasks, hover states
- Micro-interactions: hover lift, complete sweep, pin bounce, drag feedback, button glows
- Light mode glass adaption
