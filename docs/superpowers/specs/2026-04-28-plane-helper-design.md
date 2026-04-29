# Plane Helper 迁移设计

**目标**

将当前单文件 `HTML` 项目迁移为基于 `npm` 管理的前后端分离项目，前端使用 `Vue 3 + Vite`，后端使用 `Node.js + Express`，并实现本地 `JSON` 数据存储与磁盘图片存储。

**范围**

- 首期迁移植物、任务、日志、图片上传与持久化
- 保留现有视觉结构与核心交互
- 暂不迁移 AI 聊天、AI 建议、FAQ 远程调用逻辑

**架构**

- `frontend/`：`Vue 3 + Vite` 前端
- `server/`：`Express` API 与静态文件服务
- `storage/data/`：`plants.json`、`tasks.json`、`logs.json`
- `storage/uploads/`：用户上传图片
- 根目录 `package.json` 统一管理开发与构建脚本

**数据模型**

- `plants`
  - `id`
  - `name`
  - `species`
  - `photo`
  - `date`
  - `status`
  - `note`
  - `tags`
  - `schedules`
- `tasks`
  - `id`
  - `type`
  - `plant`
  - `date`
  - `done`
  - `note`
- `logs`
  - `id`
  - `plant`
  - `date`
  - `text`
  - `imgs`

**接口**

- `GET /api/plants`
- `POST /api/plants`
- `PUT /api/plants/:id`
- `DELETE /api/plants/:id`
- `POST /api/plants/:id/photo`
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `PATCH /api/tasks/:id/toggle`
- `DELETE /api/tasks/:id`
- `GET /api/logs`
- `POST /api/logs`
- `DELETE /api/logs/:id`
- `POST /api/upload`
- `GET /uploads/*`

**非功能约束**

- Windows 环境下可运行
- 本地单机使用优先
- 最小改动迁移，保留现有数据结构语义
- 图片只保存路径，不保存 `base64`

**风险**

- `JSON` 文件不适合高并发写入
- 单文件 HTML 中存在较多内联状态与视图耦合，迁移时需要按功能拆分
- 当前原始文件存在编码异常文本，迁移时以结构与逻辑为准，不直接依赖乱码内容
