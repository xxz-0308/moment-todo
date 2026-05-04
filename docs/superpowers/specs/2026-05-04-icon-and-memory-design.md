# Icon Unification & Memory Optimization

## 概述

v1.0.1 完善版：统一应用图标（标题栏、任务栏、托盘），优化空闲内存占用。

---

## 1. App Icon — 菱形+勾

### 1.1 设计

- **形状**：正方形旋转 45° 的菱形，圆角 2px
- **颜色**：indigo 渐变 `#6366f1`（左下）→ `#818cf8`（右上）
- **内部**：白色极简勾（仿 Lucide Check，strokeWidth 3），居菱形中心视觉偏上 1px
- **光泽**：菱形左上角径向微光，模拟玻璃高光
- **备用方案**：若 B 方案不满意，切换到 A 方案——四角星芒（indigo 渐变底 + 白色星形）

### 1.2 生成与部署

| 位置 | 格式 | 来源 |
|------|------|------|
| 标题栏左上角 | React 内联 SVG（16x16） | TitleBar.tsx 硬编码 SVG |
| 任务栏 / 安装包 | 512x512 PNG → electron-builder 自动生成 ICO | `public/icon.png` |
| 托盘 | 32x32 PNG | `public/icon-32.png`，替代 `generateTrayIconPNG()` |

### 1.3 实施

- 用 SVG 绘制菱形+勾，导出为 512x512 和 32x32 两个 PNG 文件，放入 `public/`
- `electron-builder.yml` 添加 `icon: public/icon.png` 指向 512 图标
- `main.ts` 托盘：删除 `generateTrayIconPNG()`、`roundedRectDist()`、`createPNGChunk()`、`crc32()`、`ensureTrayIcon()` 函数（约 100 行代码生成逻辑），改为直接读取 `public/icon-32.png`
- `main.ts`：`TRAY_ICON_PATH` 常量移除，托盘图标使用 `path.join(__dirname, '../public/icon-32.png')`（prod）或 `path.join(__dirname, '../../public/icon-32.png')`（dev 路径适配）
- `TitleBar.tsx`：将 `SquareStack` 图标 + 紫色方块 div 替换为内联 SVG（菱形 + 勾，16x16px），视觉与托盘一致
- `electron-builder.yml`：`asar.unpack` 添加 `public/icon-32.png`，确保打包后托盘图标可访问

---

## 2. Memory Optimization

### 2.1 现状

空闲 ~150MB：Electron 壳 80-90MB + sql.js WASM 堆 30-40MB + 渲染进程 20-30MB。

### 2.2 优化策略

**A. 窗口隐藏时关闭 sql.js 数据库**

- `main.ts`：在 `mainWindow.on('close')` 隐藏窗口时，调用 `db.close()` 关闭 WASM 连接，释放 WASM 堆
- 窗口恢复显示时（`mainWindow.show()`），重新调用 `loadDatabase()` 打开数据库
- 需要注意：IPC handler 中所有 `db` 引用前加 null check，防止隐藏状态下的 IP 调用崩溃。若 `db` 为 null，返回空数组/空结果
- 预期释放：~30-40MB

**B. 窗口隐藏时触发 GC**

- 在 `mainWindow.on('close')` 隐藏窗口后，添加 `mainWindow.webContents.executeJavaScript('if (window.gc) window.gc()')` 触发 V8 垃圾回收
- 在 `mainWindow.show()` 时不做额外处理

**C. 移除未使用的提醒系统代码**

- 当前 `checkReminders()`、`startReminders()`、`stopReminders()` 虽未启动（第 427 行注释掉了 `startReminders()`），但代码仍在二进制中
- `notifiedTasks` Set 和 `reminderInterval` 变量始终占用微小的内存
- 不作为本轮重点（内存影响可忽略）

### 2.3 预期效果

| 状态 | 优化前 | 优化后 |
|------|--------|--------|
| 前台使用 | ~150MB | ~120MB |
| 最小化到托盘 | ~150MB | ~50-60MB |

### 2.4 实施

- `main.ts`：在窗口 close 事件中，在 `saveDatabase()` 和 `backupDatabase()` 之后，添加 `db?.close(); db = null`
- `main.ts`：在 `show()` 回调 / tray click 恢复窗口时，若 `db === null` 则调用 `loadDatabase()`
- `main.ts`：IPC handler 的 `queryAll()` 和 `execMod()` 中，若 `db` 为 null 则返回空结果
- `main.ts`：窗口 hide 后触发 `webContents.executeJavaScript('if (window.gc) window.gc()')`
