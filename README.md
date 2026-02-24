# TimeBlank - 朋友时间协调工具

一个简洁美观的多人空闲时间协调 Web 应用。创建房间、分享口令，每个人拖拽选择自己的空闲时段，热力图直观展示所有人的时间交集，轻松找到大家都有空的时间。

灵感来源于 [when2meet](https://www.when2meet.com/)，但 UI 更现代。

## 功能特性

- **房间口令系统**：创建房间自动生成 6 位口令，分享给朋友即可加入
- **拖拽式时间选择**：在时间网格上拖拽选择空闲时段，支持桌面端鼠标和移动端触摸
- **热力图结果展示**：颜色深浅直观反映该时段可用人数，悬浮显示具体哪些人有空
- **最佳时间推荐**：自动高亮可用人数最多的时段
- **参与者管理**：实时显示所有参与者及其选择状态
- **数据持久化**：SQLite 本地数据库存储，刷新不丢失
- **会话记忆**：localStorage 记住用户身份，关闭浏览器重新打开无需重新加入

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | [Next.js](https://nextjs.org/) 16 (App Router) |
| 语言 | TypeScript |
| UI 组件 | [shadcn/ui](https://ui.shadcn.com/) |
| 样式 | [Tailwind CSS](https://tailwindcss.com/) v4 |
| 数据库 | [SQLite](https://www.sqlite.org/) (via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)) |
| 图标 | [Lucide React](https://lucide.dev/) |

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── rooms/
│   │   │   ├── route.ts            # POST 创建房间
│   │   │   └── [code]/route.ts     # GET 房间详情 / POST 加入房间
│   │   └── slots/route.ts          # POST 保存时间选择
│   ├── room/[code]/page.tsx        # 房间页面
│   ├── page.tsx                    # 首页
│   └── layout.tsx                  # 全局布局
├── components/
│   ├── CreateRoomDialog.tsx         # 创建房间弹窗
│   ├── TimeGrid.tsx                 # 时间选择网格（核心组件）
│   ├── HeatMap.tsx                  # 热力图结果展示
│   ├── Toast.tsx                    # 通知提示
│   └── ui/                          # shadcn/ui 基础组件
└── lib/
    └── db.ts                        # 数据库初始化与操作
```

## 快速开始

### 环境要求

- Node.js >= 18

### 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

### 构建生产版本

```bash
npm run build
npm run start
```

## 部署

项目内置了部署脚本和 Nginx 配置参考：

```bash
# 一键构建部署包
bash deploy.sh
```

生成的 `deploy-package/` 目录包含所有运行所需文件，上传到服务器后：

```bash
# 直接启动
bash start.sh

# 或使用 PM2 管理进程
pm2 start ecosystem.config.js
```

Nginx 反向代理配置参考 `nginx.conf.example`。

## 使用流程

1. 打开首页，点击「创建房间」
2. 填写活动名称、选择日期范围和每日时间段
3. 将生成的 6 位口令分享给朋友
4. 朋友在首页输入口令进入房间
5. 每人输入昵称后，在网格上拖拽选择自己的空闲时间，点击保存
6. 切换到「查看结果」标签，热力图展示所有人的时间重叠情况

## License

MIT
