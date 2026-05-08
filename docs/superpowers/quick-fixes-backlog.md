# Quick Fixes Backlog

这些是可以直接实现的 bug 修复和优化，暂时记录在此，等复杂功能讨论完后一起实现。

## Bug 修复

### 1. 逾期的待办置顶不生效
**文件**: `src/components/TaskList.tsx`
**问题**: sortedOverdue 没有使用 autoSort，导致 pinned 逻辑不生效
**修复**: 
```ts
const sortedOverdue = effectiveSortManual
  ? overdueTasks
  : autoSort(overdueTasks)  // 使用 autoSort 而不是自定义排序
```

### 2. 成员计数错误 (7人→断开→1人→重连→7人)
**文件**: `electron/team-server.ts`
**问题**: 客户端断线时没有从 clients Map 中移除，导致 totalCount 计算错误
**修复**: 在 ws.on('close') 和 ws.on('error') 中添加 `this.clients.delete(memberId)`，并广播新的 totalCount

## 功能实现

### 3. 恢复和导入数据功能
**文件**: `electron/main.ts`, `src/components/Settings.tsx`
**实现**:
- 添加 `db:restore` IPC handler (从备份文件恢复)
- 添加 `db:import-json` IPC handler (从 JSON 导入)
- Settings 中添加"恢复备份"和"导入数据"按钮
- 使用 Electron dialog.showOpenDialog 选择文件

## 优化实现

### 4. 今天完成的待办划线保留到明天
**文件**: `src/components/TaskList.tsx`, `src/components/TaskItem.tsx`
**实现**:
- TaskList 的 'today' 视图过滤逻辑改为：`t.due_date === today || (t.completed && t.due_date === today && completedToday(t))`
- TaskItem 添加 strikethrough 样式当 `showCompletedState && task.completed`
- 需要在 Task 中记录 completed_at 时间戳（或从 updated_at 推断）

### 5. 指派任务的应用内通知+图标闪烁
**文件**: `src/App.tsx`, `electron/main.ts`, `electron/team-server.ts`
**实现**:
- team-server.ts 在 task:assign 消息中触发通知
- main.ts 添加 `mainWindow.flashFrame(true)` 调用
- App.tsx 的 team event handler 中添加 Toast 通知（已有 Windows 通知）

### 6. 分类名字不能重复
**文件**: `src/store/index.ts`, `src/lib/team-store.ts`
**实现**:
- addList: 检查 `lists.some(l => l.name === name.trim())`，重复则 addToast 提示
- updateList: 检查除当前 list 外是否有重名
- 个人和团队模式都需要检查
