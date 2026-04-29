# PlaneHelper

本仓库是一个面向本地场景的智能植物养护助手，接入豆包实现智能养护。

## 项目状态

项目计划于 **2026-04-29** 起进入关闭/封存状态：

- 不再继续新增功能
- 仅保留代码、设计文档和本地运行能力，供回溯与参考
- 如无明确接手人，不建议继续在当前架构上追加复杂能力

## 项目简介

PlaneHelper 用于管理家庭植物养护数据，核心能力包括：

- 植物信息管理
- 养护任务生成与跟踪
- 生长日志记录
- 图片上传与压缩
- 基于 Doubao 的 AI 问答与日志分析
- 本地 `JSON` 文件持久化

这是一个明显偏单机、本地化的数据应用，不是面向多用户或高并发场景的系统。

## 已实现功能

### 1. 总览页

- 展示植物数量、今日任务、健康状态、季节信息
- 展示近期养护动态与日志摘要

### 2. 植物管理

- 新增、查看、编辑、删除植物
- 保存植物名称、学名、状态、备注、标签、养护周期
- 删除植物时会同时归档关联任务、日志与图片路径

### 3. 养护任务

- 支持 `water`、`fertilize`、`prune`、`repot`
- 支持今日任务、近期任务、日历规划
- 同一植物同类型任务只保留一条未完成待办，避免重复提醒
- 完成任务后会自动补写系统记录

### 4. 生长记录

- 手动添加观察记录
- 上传日志图片
- 展示用户记录、系统记录、AI 分析记录

### 5. AI 能力

- AI 园丁问答
- 基于近 30 天日志与图片的植物分析
- 生成植物 `aiProfile`

## 关键限制

这是当前仓库最需要明确写出来的部分。

### 1. 新增植物依赖 AI 建档

后端 `POST /api/plants` 会调用 AI 生成 `aiProfile`。如果 `ARK_API_KEY` 未配置，或 Doubao 接口不可用，新增植物会失败，而不是降级保存基础数据。

这意味着：

- 不配置 AI 环境变量时，项目不是完全可用状态
- AI 页面的问答、日志分析也会不可用

### 2. 存储方案仅适合本地单机

数据直接写入 `storage/data/*.json`：

- 不适合高并发写入
- 不适合多用户共享
- 不适合生产级审计、回滚、权限控制

### 3. 当前架构不适合继续重度演进

如果后续要支持以下能力，建议直接重构而不是在当前基础上硬加：

- 多用户账号体系
- 云端同步
- 实时协作
- 复杂权限
- 大规模图片管理
- 更强的 AI 工作流编排

## 技术栈

- 前端：`Vue 3`、`Vue Router`、`Vite`
- 后端：`Node.js`、`Express`
- 测试：`Vitest`、`Supertest`
- 图片处理：`sharp`
- 文件上传：`multer`
- 数据存储：本地 `JSON` 文件
- AI 服务：Doubao / 火山方舟兼容接口

## 目录结构

```text
PlaneHelper/
├─ frontend/                 前端应用
│  ├─ src/
│  │  ├─ pages/              页面
│  │  ├─ composables/        数据与交互逻辑
│  │  └─ utils/              工具函数
│  └─ dist/                  前端构建产物
├─ server/                   后端服务
│  ├─ src/
│  │  ├─ routes/             API 路由
│  │  ├─ services/           业务服务
│  │  └─ lib/                文件存储与种子数据
│  └─ tests/                 后端测试
├─ storage/
│  ├─ data/                  plants/tasks/logs/archives 数据
│  └─ uploads/               上传后的图片
├─ docs/                     设计与计划文档
└─ plant_care_v2.html        旧版单文件原型/迁移来源
```

## Windows 启动方式

### 1. 安装依赖

```powershell
npm install
npm --prefix frontend install
npm --prefix server install
```

### 2. 配置后端环境变量

```powershell
Copy-Item server\.env.example server\.env
```

然后编辑 `server\.env`，至少补齐：

```env
ARK_API_KEY=your_ark_api_key
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_MODEL=doubao-1-5-vision-lite-250315
```

如果不配置 `ARK_API_KEY`，AI 相关能力和新增植物能力会受影响。

### 3. 本地开发启动

```powershell
npm run dev
```

默认会并行启动：

- 前端：`frontend`
- 后端：`server`

### 4. 构建前端

```powershell
npm run build
```

### 5. 运行测试

根目录测试命令当前只覆盖后端测试：

```powershell
npm test
```

如需单独执行前端测试：

```powershell
npm --prefix frontend run test
```

## 数据与文件位置

### 业务数据

- `storage/data/plants.json`
- `storage/data/tasks.json`
- `storage/data/logs.json`
- `storage/data/plant-archives.json`

### 上传图片

- `storage/uploads/`

### 环境变量

- `server/.env`

注意：`server/.env` 包含敏感信息，不应继续外传或公开提交。

## API 范围

当前后端已实现的主要接口包括：

- `GET /api/plants`
- `GET /api/plants/:id`
- `POST /api/plants`
- `PUT /api/plants/:id`
- `POST /api/plants/:id/ai-profile/regenerate`
- `DELETE /api/plants/:id`
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `PATCH /api/tasks/:id/toggle`
- `DELETE /api/tasks/:id`
- `GET /api/logs`
- `POST /api/logs`
- `DELETE /api/logs/:id`
- `POST /api/upload`
- `POST /api/ai/chat`
- `POST /api/ai/analyze-logs`

## 封存建议

如果仓库准备正式关闭，建议至少完成下面几件事：

1. 确认 `server/.env` 不会被提交或对外暴露。
2. 备份 `storage/data/` 与 `storage/uploads/`，否则本地数据会丢。
3. 保留 `docs/` 目录，它比代码注释更能说明当前设计边界。
4. 如果只做源码存档，可以保留 `frontend/dist/`；如果只保留源代码，也可以后续删除构建产物以缩小仓库体积。
5. 如果后面有人接手，优先替换掉 `JSON` 存储和“新增植物强依赖 AI”这两个设计点。

## License

当前 `package.json` 标记为 `ISC`。
