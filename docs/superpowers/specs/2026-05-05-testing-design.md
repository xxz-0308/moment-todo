# Testing Infrastructure Design

> **Goal:** Build a three-layer testing pyramid (unit + component + E2E) for the Moment todo app to prevent regression bugs, especially around store logic, team sync, and core user flows.

**Architecture:** Vitest (unit + component) + Playwright (E2E). Keep existing vitest config, add setup file and test utilities, extend store/db tests, add component tests, add Playwright for E2E smoke tests.

**Tech Stack:** Vitest 4 + @testing-library/react 16 + @testing-library/jest-dom 6 + Playwright (for E2E) + @vitest/coverage-v8

---

## File Structure

```
src/
  __tests__/              # Shared test infrastructure
    setup.ts              # Global: jest-dom matchers + window.electronAPI mock
    test-utils.tsx         # Custom render() wrapping Zustand store
    factories.ts          # makeTask / makeList / makeMember factories
  store/__tests__/
    index.test.ts         # Extend: ~25 → ~50 tests
  lib/__tests__/
    team-store.test.ts    # Extend: ~8 → ~25 tests
  db/__tests__/
    index.test.ts         # New: ~25 tests
  components/__tests__/
    TaskItem.test.tsx
    Sidebar.test.tsx
    DetailPanel.test.tsx
    QuickAdd.test.tsx
    TaskList.test.tsx
    CommandPalette.test.tsx
    TeamPlanet.test.tsx
    EmptyState.test.tsx
e2e/
  fixtures/               # Test DB files with preset data
  quick-add-and-complete.spec.ts
  lists-and-views.spec.ts
  edit-and-undo.spec.ts
  team-server-client.spec.ts
  multi-select.spec.ts
  search.spec.ts
playwright.config.ts
vitest.config.ts          # Updated: setupFiles + coverage
```

---

## Layer 1: Unit Tests (80-100 tests)

### Store (`src/store/__tests__/index.test.ts`) — extend to ~50

**Already covered (keep):** theme, view & selection, addTask, updateTask, toggleComplete, removeTask, undo (basic), lists (basic), reorderTasks, toasts, loadData, scope (basic)

**New tests to add:**

#### togglePin (3 tests)
- toggles pinned flag from false to true
- pushes undo action with correct type
- toggles back from true to false

#### search (5 tests)
- personal mode: calls db.searchTasks with query and scope='personal'
- team mode: filters team-store tasks in-memory
- empty query returns no results
- Chinese character search works
- no cross-contamination between personal and team scopes

#### addList (3 tests)
- creates list with name and default color
- rejects empty name
- generated color defaults to '#6366f1'

#### updateList (2 tests)
- renames list successfully
- ignores update for non-existent list id

#### removeList (3 tests)
- deletes list and moves tasks to default
- pushes undo action for list deletion
- cannot delete 'default' list (id === 'default')

#### undo supplements (5 tests)
- undoes task edit (title change) and restores previous values
- undoes addList and removes the list
- undoes removeList and restores the list with its tasks
- undo stack maximum of 20 items (oldest dropped)
- team action undo routes to team-store.sendMessage, not local DB

#### scope switching (4 tests)
- switching scope clears current selection
- personal→team: data source switches to team-store
- team→personal: data source switches back to personal store
- rapid switching does not cause stale state

#### sort logic (3 tests)
- auto-sort orders by priority (high→medium→low) then due_date
- manual sort preserves user-defined order
- toggling sort mode stays consistent after data reload

#### loadData (2 tests)
- fetches tasks and lists on startup
- shows error toast when fetch fails

#### edge cases (several)
- concurrent addTask calls get unique sort_orders
- tasks with special characters in title
- very long title strings

---

### Team Store (`src/lib/__tests__/team-store.test.ts`) — extend to ~25

**Already covered (keep):** sync:full, task:created/updated/deleted, member:joined (basic), member:left, connection status (basic)

**New tests to add:**

#### message routing (6 tests)
- task:created: prepends task and sorts correctly
- task:updated: merges partial updates into existing task
- task:deleted: removes task from state
- list:created: appends list with sort_order
- list:deleted: removes list, tasks remain (moved to default)
- list:updated: renames list in-place

#### connection status (4 tests)
- 'connected': saves a snapshot of current state
- 'disconnected': preserves data for read-only access
- 'connecting': sets status without clearing data
- intentional disconnect: does not auto-reconnect

#### reconnect summary (3 tests)
- diff correctly identifies new tasks added while disconnected
- diff correctly identifies tasks completed while disconnected
- empty diff produces no summary message

#### sync:full (3 tests)
- full data replacement clears stale entries
- duplicate IDs are deduplicated
- newly synced tasks added to internal snapshot

#### sort sync (2 tests)
- sort:mode event updates manualSort flag in store
- setManualSort broadcasts via sendMessage

#### sendMessage (3 tests)
- sends valid message via IPC
- retries on failure
- does not attempt send when offline

---

### DB Layer (`src/db/__tests__/index.test.ts`) — new, ~25 tests

Mock strategy: `vi.mock('@/db')` or mock `window.electronAPI` with `vi.stubGlobal`. Each test arranges mock return values, calls the db function, and asserts correct API calls and return values.

#### fetchTasks (3 tests)
- returns only personal-scope tasks
- returns empty array for empty DB
- tasks sorted by sort_order ASC, created_at DESC

#### fetchTasksByView (5 tests)
- 'today': filters by today's date and completed=0
- 'upcoming': filters by future date and completed=0, sorted by due_date
- 'completed': filters by completed=1, limited to 100
- custom list_id: filters by list_id
- unknown view: falls back to list_id query

#### createTask (4 tests)
- inserts with correct fields and returns created task
- auto-computes sort_order as MAX+1 when not provided
- fills default values (priority='medium', listId='default', notes='')
- accepts explicit sort_order

#### updateTask (3 tests)
- updates single field correctly
- updates multiple fields in one call
- updated_at timestamp is always refreshed

#### deleteTask (2 tests)
- deletes existing task
- deleting non-existent task does not throw

#### reorderTasks (2 tests)
- batch updates sort_order and list_id for all items
- empty array does nothing

#### fetchLists (2 tests)
- returns personal-scope lists sorted by sort_order
- returns empty array for empty DB

#### searchTasks (3 tests)
- matches title with LIKE query
- matches notes with LIKE query
- scope parameter filters results

#### getStats (3 tests)
- date range filter applied correctly
- byList aggregation groups by list name
- byDay aggregation groups by date

---

## Layer 2: Component Tests (20-30 tests)

All use `@testing-library/react` with a custom `render()` that wraps components in the Zustand store context.

### Test Infrastructure

#### `src/__tests__/setup.ts`
```
import '@testing-library/jest-dom'
// Global mock for window.electronAPI (used by all components)
```

#### `src/__tests__/test-utils.tsx`
```
Custom render() function that:
- Creates a fresh Zustand store with test defaults
- Wraps component in store provider
- Supports overriding initial state per test
```

#### `src/__tests__/factories.ts`
```
makeTask(overrides?) → Task with defaults
makeList(overrides?) → List with defaults
makeMember(overrides?) → TeamMember with defaults
```

### Component Test Specs

#### TaskItem (5 tests)
- renders title and completion checkbox
- clicking checkbox calls toggleComplete
- Ctrl+Click selects the task (shows selected state)
- renders priority color indicator
- renders assignee badge with member name and color when assigned

#### Sidebar (5 tests)
- renders preset views (今天/计划日程/已完成)
- clicking view calls setCurrentView
- renders custom lists with names
- new list input: typing + Enter calls addList and clears input
- scope tabs switch between personal and team

#### DetailPanel (4 tests)
- renders task title input with current value
- changing priority calls updateTask
- renders assignee selector with team members
- close button calls appropriate close handler

#### QuickAdd (3 tests)
- renders title input
- typing + Enter creates task and clears input
- Esc key closes the panel

#### TaskList (4 tests)
- renders filter chips for active filters
- clearing all filters shows full task list
- empty state message when no tasks match
- sort toggle button switches between auto and manual

#### CommandPalette (2 tests)
- search input filters results
- Esc key closes palette

#### TeamPlanet (3 tests)
- renders online members with green indicator
- renders offline members with gray dashed ring
- clicking a member shows detail footer

#### EmptyState (2 tests)
- personal mode shows personal greeting
- team mode shows team message with connection hint

---

## Layer 3: E2E Tests (5-8 tests)

### Playwright Setup

`playwright.config.ts`:
- Use `electron.launch()` to start the app
- Each test gets a fresh test DB from `e2e/fixtures/`
- Run serially (can't parallelize Electron windows)

### E2E Specs

#### `quick-add-and-complete.spec.ts`
1. Launch app
2. Press Ctrl+N → type "Test task" → press Enter
3. Verify task appears in task list
4. Click completion checkbox → verify strikethrough
5. Verify toast appears with undo option

#### `lists-and-views.spec.ts`
1. Launch app
2. Create new list "工作" in sidebar
3. Switch to "工作" view → verify empty state
4. Add task in "工作" view → verify task appears with correct list
5. Switch to "计划日程" → verify task not shown (wrong view)

#### `edit-and-undo.spec.ts`
1. Launch app with preset task
2. Double-click task → open DetailPanel
3. Change title → blur to save
4. Press Ctrl+Z to undo
5. Verify title reverted

#### `team-server-client.spec.ts`
1. Launch app as server (pre-configured test DB)
2. Verify "已连接" status in sidebar
3. Add team task → verify it appears in task list
4. Launch second instance as client → verify connection

#### `multi-select.spec.ts`
1. Launch app with 3 preset tasks
2. Ctrl+Click on task 1 → verify selected state
3. Ctrl+Click on task 2 → verify both selected
4. Press Delete → verify both removed
5. Verify undo toast appears

#### `search.spec.ts`
1. Launch app with preset tasks
2. Press Ctrl+K → type search query
3. Verify matching results appear
4. Click a result → verify DetailPanel opens
5. Press Esc → verify palette closes

---

## Coverage

- Add `@vitest/coverage-v8` as devDependency
- Add script: `"test:coverage": "vitest run --coverage"`
- No hard coverage gate — run after implementation to identify blind spots
- Expected rough coverage: store ~90%, db ~85%, components ~60%, overall ~70%

---

## Implementation Order

1. **Infrastructure first:** setup.ts + test-utils.tsx + factories.ts (extract from existing tests)
2. **Unit tests:** store extensions → team-store extensions → db layer (new)
3. **Component tests:** TaskItem → Sidebar → DetailPanel → QuickAdd → TaskList → rest
4. **E2E last:** playwright.config.ts → fixtures → specs (most complex setup, added last)
