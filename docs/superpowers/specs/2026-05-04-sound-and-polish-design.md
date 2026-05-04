# Sound & Animation Polish

## 概述

在 Glass Redesign 完成后的第二轮细节打磨。新增 5 个音效覆盖关键操作反馈；调校 6 处动画参数减少"弹跳感"；修复 1 个 ShortcutHints z-index 冲突 bug。

## 设计原则

- **音效**：只加在"有动作感"的操作上（拖拽、置顶、撤销等），不加在导航、hover、输入等高频场景，避免噪音污染
- **动画**：减少位移幅度、提高阻尼、缩短收敛时间，动画存在但不抢戏
- **bug**：弹窗层级体系需保持一致

---

## 1. 音效系统

### 1.1 新增音效函数

所有新函数定义在 `src/hooks/useSound.ts`，遵循现有 `playTone()` 的 Oscillator 合成模式（不引入音频文件）。

| 函数名 | 场景 | 声音设计 | 触发位置 |
|--------|------|----------|----------|
| `playPinSound()` | 置顶/取消置顶 | 短促高频咔嗒（800Hz, 0.06s, square），类似开关按下的清脆感 | `TaskItem.tsx` Pin 按钮 onClick |
| `playDragPickupSound()` | 拖拽拎起 | 极轻短音（300Hz, 0.05s, sine, vol=0.04），抓卡片瞬间 | `TaskItem.tsx` Reorder.Item onDragStart |
| `playDragDropSound()` | 拖拽落位 | 轻微低音落定（180Hz, 0.08s, triangle, vol=0.05） | `TaskItem.tsx` Reorder.Item onDragEnd |
| `playUndoSound()` | 撤销操作 | 反向音阶——先高后低（1100Hz→600Hz, 0.12s），有"倒带"感 | `store/index.ts` undo() |
| `playQuickAddSound()` | 快速添加确认 | 短上扬（660Hz, 0.08s, sine, vol=0.05），比完成音更轻更短 | `QuickAdd.tsx` handleSubmit / `TitleBar.tsx` handleCapture |

### 1.2 现有音效保留

`playCompleteSound`、`playDeleteSound`、`playCelebrationSound` 不动。

### 1.3 触发点

- `store/index.ts`：撤销时触发 `playUndoSound()`
- `TaskItem.tsx`：Pin 点击触发 `playPinSound()`；拖拽拎起/落位分别在 Reorder.Item 的 onDragStart/onDragEnd 触发
- `QuickAdd.tsx`：回车提交时触发 `playQuickAddSound()`
- `TitleBar.tsx`：快速记录回车时触发 `playQuickAddSound()`

---

## 2. 动画打磨

### 2.1 DetailPanel + TaskList 弹簧收紧

**问题**：`stiffness: 170, damping: 26` 是一个极软的低阻尼弹簧，面板滑出时大幅晃荡数下，TaskList 同步弹性收窄，产生"整页在弹"的混乱感。

**修改**：
- `DetailPanel.tsx`：入场弹簧 `170/26` → `350/32`（更快更干脆）
- `TaskList.tsx`：外层 `motion.div` 的 `layout` 弹簧 `170/26` → `350/32`
- `TaskList.tsx`：`motion.div` 添加 `transition={{ layout: { type: 'spring', stiffness: 350, damping: 32, delay: 0.05 } }}`——延迟 50ms 再收窄，不与 DetailPanel 同步启动

### 2.2 CommandPalette / QuickAdd 入场减量

**问题**：`y: -20` + `scale: 0.96` 叠加，幅度偏大会有"砸下来"感。

**修改**：
- `CommandPalette.tsx` 和 `QuickAdd.tsx`：`y: -20` → `y: -12`，`scale: 0.96` → `scale: 0.98`
- 弹簧保持不变 `500/35`

### 2.3 Toast 退出方向统一

**问题**：Toast 入场从下方 `y: 16` 进来，退出却向上 `y: -8` 飘走，进出方向不一致。

**修改**：
- `Toast.tsx`：exit 动画 `y: -8` → `y: 8`（向下退出，和进场方向一致）

### 2.4 EmptyState 奖杯呼吸调暗减少

**问题**：opacity 在 0.8–1 之间循环，0.8 太暗导致奖杯有时几乎看不见。

**修改**：
- `EmptyState.tsx`：`opacity: [0.8, 1, 0.8]` → `opacity: [0.9, 1, 0.9]`

### 2.5 DatePicker 弹出加弹簧

**问题**：`duration: 0.18` 纯淡入，缺少和项目其他弹窗一致的弹簧手感。

**修改**：
- `DatePicker.tsx`：替换 `transition={{ duration: 0.18 }}` 为 `transition={{ type: 'spring', stiffness: 400, damping: 30 }}`

### 2.6 手动排序空列表提示

**问题**：切换到手动排序时列表为空，没有提示说明当前处于手动排序模式。

**修改**：
- `TaskList.tsx`：在 `allTasks.length === 0 && sortManual` 时，渲染 EmptyState 的同时，在其下方追加一行提示 `"当前为手动排序模式，点击「自动排序」切换回默认排列"`
- 不修改 EmptyState 组件签名——提示文本通过 TaskList 的布局层叠在 EmptyState 下方显示

---

## 3. Bug 修复

### 3.1 ShortcutHints 遮挡其他弹窗

**问题**：ShortcutHints 使用 `z-[70]`，CommandPalette 使用 `z-50`。按住 Ctrl 触发快捷键提示后，再按 K 打开搜索，提示面板浮在搜索之上。且 Ctrl 未释放时提示不消失。

**修复**：
- `ShortcutHints.tsx`：z-index 从 `z-[70]` 降至 `z-[45]`，低于 CommandPalette/QuickAdd（z-50）
- `ShortcutHints.tsx`：监听 store 的 `showCommandPalette` 和 `showQuickAdd`，当任一变为 true 时立即设置 `visible = false`
