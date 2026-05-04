# Moment

自己用的 Windows 待办软件，练手项目。

写这个东西主要是觉得市面上的 todo app 要么太重要么太丑，干脆自己搞一个。AI 写的代码，我负责提需求和挑毛病。

## 能干什么

- 添加、完成、删除待办，支持优先级和截止日期
- 今天 / 计划日程 / 全部 / 自定义列表，不同视图切换着看
- 手动拖拽排序，或者自动按优先级+日期排
- 任务置顶，重要的事放最上面
- Ctrl+N 快速添加，Ctrl+K 搜任务，Ctrl+Z 撤销
- 按住 Ctrl 弹出快捷键提示
- 输入"明天"、"下周一"这种日期会自动识别
- 深色/浅色切换
- 关掉窗口会缩到托盘，不会退出
- 统计面板看看这周干了啥

## 下载

装个 [Moment-1.0.0-setup.exe](https://github.com/xxz-0308/moment-todo/releases) 就行了，Windows 的安装包。

## 开发

```bash
npm install
npm run dev       # 本地跑
npm run build     # 构建
npm run package   # 打包安装包
npm test          # 跑测试
```

用了 Electron + React + Tailwind + Framer Motion + sql.js，数据都存在本地 SQLite 里。

## 免责

这玩意是我自己练手的，可能有 bug，别放重要数据。
