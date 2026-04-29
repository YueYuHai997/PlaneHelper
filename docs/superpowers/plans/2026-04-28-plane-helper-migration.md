# Plane Helper Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将单文件植物管理页面迁移为 `Vue 3 + Vite + Express` 项目，并实现本地 JSON 数据持久化与图片文件存储。

**Architecture:** 根目录统一管理 `frontend` 与 `server` 两个子项目。后端负责 JSON 文件读写、图片上传与静态资源服务；前端负责页面拆分、状态管理与调用后端接口。首期只覆盖植物、任务、日志与图片上传。

**Tech Stack:** `Vue 3`、`Vite`、`Express`、`Multer`、`Vitest`、`Supertest`、`npm-run-all`

---

### 文件结构

**Create**

- `frontend/`
- `server/`
- `storage/data/plants.json`
- `storage/data/tasks.json`
- `storage/data/logs.json`
- `storage/uploads/.gitkeep`
- `docs/superpowers/specs/2026-04-28-plane-helper-design.md`

**Modify**

- `package.json`
- `.gitignore`

### Task 1: 初始化工程骨架

**Files:**

- Create: `frontend/*`
- Create: `server/*`
- Modify: `package.json`

- [ ] **Step 1: 创建前后端目录与根脚本**
- [ ] **Step 2: 安装前端依赖与后端依赖**
- [ ] **Step 3: 安装测试依赖**
- [ ] **Step 4: 初始化存储目录与空 JSON 文件**

### Task 2: 为存储层写失败测试

**Files:**

- Create: `server/tests/storage.test.js`
- Create: `server/tests/app.test.js`

- [ ] **Step 1: 编写 JSON 读写与初始化测试**
- [ ] **Step 2: 运行测试，确认因模块缺失或实现缺失而失败**
- [ ] **Step 3: 编写上传与 API 基础行为测试**
- [ ] **Step 4: 运行测试，确认失败原因正确**

### Task 3: 实现后端最小可用版本

**Files:**

- Create: `server/src/app.js`
- Create: `server/src/index.js`
- Create: `server/src/config.js`
- Create: `server/src/lib/fileStore.js`
- Create: `server/src/lib/seedData.js`
- Create: `server/src/routes/plants.js`
- Create: `server/src/routes/tasks.js`
- Create: `server/src/routes/logs.js`
- Create: `server/src/routes/upload.js`

- [ ] **Step 1: 实现 JSON 文件初始化与读写**
- [ ] **Step 2: 实现植物、任务、日志接口**
- [ ] **Step 3: 实现图片上传与静态资源服务**
- [ ] **Step 4: 运行测试并修正到通过**

### Task 4: 迁移前端到 Vue

**Files:**

- Create: `frontend/src/**/*`
- Modify: `frontend/package.json`

- [ ] **Step 1: 创建路由、页面和 API 模块**
- [ ] **Step 2: 迁移植物、任务、日志页面结构**
- [ ] **Step 3: 接入图片上传与表单提交**
- [ ] **Step 4: 保留原页面视觉方向，移除对内存写死数据的依赖**

### Task 5: 联调与验收

**Files:**

- Modify: `README.md`（如需要）

- [ ] **Step 1: 运行后端测试**
- [ ] **Step 2: 运行前端构建**
- [ ] **Step 3: 运行根目录联调命令检查启动**
- [ ] **Step 4: 核对植物、任务、日志、上传四条主链路**
