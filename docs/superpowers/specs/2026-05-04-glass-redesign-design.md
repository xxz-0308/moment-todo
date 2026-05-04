# Glass Redesign: Moment Todo App 视觉与交互升级

## 概述

对 Moment todo app 进行全面的 Glassmorphism 视觉风格升级 + 微交互打磨。覆盖所有 UI 区域，建立统一的玻璃材质体系。

## 设计目标

- **视觉风格**: Glassmorphism 玻璃质感，4 层材质体系
- **动效密度**: Micro-interactions 微交互为主
- **范围**: 全部区域（Sidebar, TaskList/TaskItem, DetailPanel, CommandPalette, QuickAdd, Settings, Stats, EmptyState, Toast, TitleBar）

---

## 1. 材质系统（CSS 变量层）

### 1.1 4 层玻璃层级

| 层级 | 用途 | 背景 | 模糊 | 边框 | 阴影 |
|------|------|------|------|------|------|
| **L0** 底板 | 主内容区（TaskList） | 深色渐变底 | 无 | 无 | 无 |
| **L1** 面板 | Sidebar, DetailPanel | `rgba(22,22,38,0.7)` | `blur(20px)` | `rgba(255,255,255,0.06)` | `0 4px 24px rgba(0,0,0,0.3)` |
| **L2** 浮层 | CommandPalette, QuickAdd | `rgba(28,28,48,0.85)` | `blur(32px)` | `rgba(255,255,255,0.1)` | `0 16px 64px rgba(0,0,0,0.6)` |
| **L3** 强调 | 选中态, Hover 卡片 | `rgba(99,102,241,0.08-0.15)` | 无 | `rgba(99,102,241,0.15-0.3)` | `0 0 20px rgba(99,102,241,0.08)` |

### 1.2 新增 CSS 变量

```css
--glass-bg: rgba(22, 22, 38, 0.7);
--glass-border: rgba(255, 255, 255, 0.06);
--glass-blur: blur(20px);
--glass-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
--glass-elevated-bg: rgba(28, 28, 48, 0.85);
--glass-elevated-blur: blur(32px);
--glass-elevated-shadow: 0 16px 64px rgba(0, 0, 0, 0.6);
--glow-accent: 0 0 20px rgba(99, 102, 241, 0.15);
--noise-texture: url("data:image/svg+xml,...");
```

### 1.3 底板背景

底板从纯色 `#0f0f0f` 改为深色微渐变：`linear-gradient(135deg, #0a0a10 0%, #0f0f18 50%, #0a0a15 100%)`，可选叠加微噪点纹理（SVG data URI）。

---

## 2. Sidebar 改造

### 2.1 容器
- L1 玻璃面板：`backdrop-blur(20px)` + 半透明背景
- 右侧保留分隔线，颜色更淡 `rgba(255,255,255,0.05)`
- 底部统计/设置按钮区上方分隔线同样淡化

### 2.2 导航项
- **选中态**: 左侧 3px 竖线指示器（当前是纯色块背景），搭配 indigo 微光环
- **未选中**: hover 时背景 `rgba(255,255,255,0.03)`，文字从 secondary(0.6) 变为 primary
- **计数 badge**: 选中时 accent 色填充 + 微光；未选中时半透明 glass

### 2.3 Today 环形进度
- 保留 SVG 环形进度条
- 添加 `drop-shadow` 光晕
- 进度变化时短脉冲动画（已用 `motion.circle` 实现 transition）

### 2.4 自定义列表
- 拖入高亮：目标列表边框 accent 发光 + `scale(1.02)`
- 删除按钮 hover：红色扩散光晕（已有基础）
- 新建列表输入：展开弹性动画 + 聚焦时边框渐变发光

---

## 3. TaskList + TaskItem 改造

### 3.1 TaskItem 卡片
每条任务从扁平行改为独立玻璃卡片：
- 背景 `rgba(255,255,255,0.02)` + 边框 `rgba(255,255,255,0.04)`
- 选中态使用 L3 强调材质
- 高优先级左侧 3px 彩色竖线保留

### 3.2 微交互
- **Hover 上浮**: `translateY(-1px)` + 阴影增强 + 边框微亮，150ms ease-out
- **完成流光**: 勾选完成时，绿色光带从左到右扫过（`linear-gradient` sweep），300ms
- **删除**: 点击删除按钮后卡片缩小 + 淡出（`scale(0.95)` + `opacity(0)`），200ms
- **Pin 图钉**: 固定/取消时小回弹（`scale: [1, 1.15, 1]` spring）
- **拖拽**: 拖拽中卡片 `scale(1.03)` + `rotate(2deg)` + 强阴影；placeholder 位置显示玻璃凹陷槽

### 3.3 日期 Badge
- 逾期：红色背景 + 微光 `box-shadow: 0 0 8px rgba(239,68,68,0.2)`
- 临近（2天内）：橙色脉冲动画（已有 pulse，增强颜色饱和度）
- 正常：半透明灰色

### 3.4 过滤 Chips
- 当前选中态是 accent 实心填充 → 改为 L3 glass 选中态（accent 微光环 + 半透明背景）

---

## 4. 浮层组件（CommandPalette / QuickAdd）

### 4.1 通用
- L2 玻璃面板：`backdrop-blur(32px)` + 最亮边框 + 最深阴影
- 遮罩层：`backdrop-blur(4px)` 轻微模糊背景
- 入场动画：`y: -20 → 0, scale: 0.96 → 1`，弹簧 `stiffness: 500, damping: 35`

### 4.2 CommandPalette
- 搜索输入框区域用分割线分隔
- 结果列表每项 hover 时 L3 微光
- 键盘导航选中项左侧细线指示器 + indigo 光晕
- Footer 快捷键提示保持

### 4.3 QuickAdd
- 更多选项展开用弹性动画
- 优先级/日期快捷按钮：选中态用 glass + 对应颜色光晕（替换当前纯色 ring）

---

## 5. DetailPanel

### 5.1 容器
- L1 玻璃面板，从右侧 spring 滑入
- TaskList 同步缩小宽度（已有，保留）

### 5.2 内容
- 优先级按钮：选中态用对应颜色的 glass 背景 + 光晕边框
- 日期选择器、列表选择器、备注区保持结构，输入框 focus 时边框渐变发光
- 删除按钮 hover：红色光晕扩散

---

## 6. Settings & Stats

### 6.1 整体
- 底板为 L0 渐变，内容区卡片用 L1 玻璃
- 关闭按钮 hover 玻璃光圈
- Header sticky 保持

### 6.2 Settings
- 主题切换卡片：选中态 accent 微光边框 + glass 背景
- 数据备份/导出按钮：L1 glass 卡片，hover 边框变亮

### 6.3 Stats
- 统计卡片：4 个 summary 卡片使用 glass 材质
- 图表容器：L1 glass 背景
- 饼图 hover 效果保持（已有 dim-others）

---

## 7. EmptyState & Toast

### 7.1 EmptyState
- 图标容器改为 L3 glass（圆角方形 + accent 微光）
- 今日全部完成：奖杯呼吸光晕增强，从微小的 pulse 变为柔和的辉光
- 问候语保持时间段逻辑不变

### 7.2 Toast
- 容器升级为 L2 玻璃
- 弹簧动画参数保持（500/35）
- 撤销按钮 hover 时 accent 微光背景

---

## 8. TitleBar

- 改动最小：背景融入底板渐变
- 窗口控制按钮 hover 时玻璃光圈
- 拖拽区保持 `-webkit-app-region: drag`

---

## 9. 全局微交互清单

| 交互 | 实现方式 |
|------|----------|
| 按钮 hover | 背景色 150ms 过渡 + 微弱 scale(1.02) |
| 按钮 tap | scale(0.97) 50ms |
| 输入框 focus | 边框颜色过渡到 accent + 外发光 |
| Checkbox 勾选 | spring 弹入，scale 0→1 |
| 列表项入场 | stagger 延迟 + 从下方 8px 淡入 |
| 页面切换 | 淡入淡出 150ms |
| 滚动条 | 保持当前 6px 宽度，thumb 颜色更柔和 |

---

## 10. 浅色模式

所有 glass 变量在 `:root.light` 下需要单独适配：背景用更亮的半透明白色（`rgba(255,255,255,0.7)`），边框用 `rgba(0,0,0,0.06)`，阴影减弱。具体值在实现阶段调校。

---

## 实施约束

- Electron 环境支持 `backdrop-filter`（Chromium ≥ 76）
- 不引入新的 npm 依赖
- 保持现有组件结构和 props 接口不变
- 所有 CSS 变量写入 `src/index.css`
- 动画参数：spring stiffness 300-500, damping 25-40
