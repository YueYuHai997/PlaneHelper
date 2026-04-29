# Plant Detail Task AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将植物详情改为 `PlantsPage` 内全局视图，收缩 `ManagePage`，并补齐自动任务调度、系统生长记录和新增植物时的 AI 建档。

**Architecture:** 后端负责所有任务编排与 AI 建档，前端只展示与提交操作，避免前端本地推导任务。`plants/tasks/logs` 三份 JSON 继续保留，但扩展字段结构，并通过统一的调度服务收口“新增植物、修改周期、完成任务、手动覆盖任务”四类场景。

**Tech Stack:** Vue 3, Vite, Express, Vitest, Supertest, local JSON storage

---

### Task 1: 后端任务调度与数据结构扩展

**Files:**
- Create: `D:\PlaneHelper\server\src\services\plantCareService.js`
- Modify: `D:\PlaneHelper\server\src\lib\seedData.js`
- Modify: `D:\PlaneHelper\server\src\routes\tasks.js`
- Modify: `D:\PlaneHelper\server\src\routes\logs.js`
- Modify: `D:\PlaneHelper\server\src\app.js`
- Test: `D:\PlaneHelper\server\tests\plant-care.test.js`

- [ ] **Step 1: 先写调度服务的失败测试**

```js
it('creates a replacement next water task after completing water', async () => {
  const service = createPlantCareService({ store, now: () => new Date('2026-04-28T10:00:00.000Z') })
  const result = await service.completeTask(101)

  expect(result.completedTask.done).toBe(true)
  expect(result.nextTask.type).toBe('water')
  expect(result.nextTask.date).toBe('2026-05-03')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm --prefix server run test -- tests/plant-care.test.js`

Expected: FAIL，提示 `Cannot find module '../src/services/plantCareService'` 或导出函数不存在。

- [ ] **Step 3: 实现最小调度服务**

```js
function addDays(dateValue, days) {
  const date = new Date(dateValue)
  date.setDate(date.getDate() + Number(days))
  return date.toISOString().slice(0, 10)
}

function createPlantCareService({ store, now = () => new Date() }) {
  async function replacePendingTask(tasks, plantId, type, nextTask) {
    const filtered = tasks.filter((task) => !(task.plant === plantId && task.type === type && !task.done))
    filtered.push(nextTask)
    return filtered
  }

  async function completeTask(taskId) {
    // 读取 plants/tasks/logs，更新 lastXxxAt，补 system log，重算 nextTask
  }

  return { completeTask }
}
```

- [ ] **Step 4: 扩展种子数据结构**

```js
{
  id: 1,
  name: '圣女果',
  schedules: { water: 3, fertilize: 14, prune: 30, repot: 365 },
  carePlan: {
    lastWateredAt: '2025-03-10',
    lastFertilizedAt: '',
    lastPrunedAt: '',
    lastRepottedAt: '',
  },
  aiProfile: {
    advice: ['保持充足日照'],
    faq: [{ q: '叶片发黄怎么办？', a: '先检查浇水和排水。' }],
    plan: {
      summary: '春夏旺长期需更稳定补水。',
      water: '见干见湿',
      fertilize: '每两周一次薄肥',
      prune: '发现徒长及时修剪',
      repot: '根系顶盆时换盆',
    },
    generatedAt: '2026-04-28T10:00:00.000Z',
  },
}
```

- [ ] **Step 5: 将 `PATCH /api/tasks/:id/toggle` 改为完成编排入口**

```js
router.patch('/:id/toggle', async (request, response, next) => {
  try {
    const result = await plantCareService.completeTask(Number(request.params.id))
    response.json(result)
  } catch (error) {
    next(error)
  }
})
```

- [ ] **Step 6: 允许日志携带 `source` 字段**

```js
const log = {
  id: Date.now(),
  plant: Number(payload.plant),
  date: payload.date,
  text: String(payload.text).trim(),
  imgs: Array.isArray(payload.imgs) ? payload.imgs : [],
  source: payload.source || 'user',
}
```

- [ ] **Step 7: 跑后端测试**

Run: `npm --prefix server run test`

Expected: PASS，原有测试和新加的调度测试全部通过。

- [ ] **Step 8: 提交后端调度层**

```powershell
git add server/src/services/plantCareService.js server/src/lib/seedData.js server/src/routes/tasks.js server/src/routes/logs.js server/src/app.js server/tests/plant-care.test.js
git commit -m "feat: add automatic plant care task scheduling"
```

### Task 2: 新增植物时 AI 建档并联动首批任务

**Files:**
- Modify: `D:\PlaneHelper\server\src\services\aiChatService.js`
- Modify: `D:\PlaneHelper\server\src\routes\plants.js`
- Modify: `D:\PlaneHelper\server\src\app.js`
- Test: `D:\PlaneHelper\server\tests\plants-ai.test.js`

- [ ] **Step 1: 先写新增植物的失败测试**

```js
it('creates plant with ai profile and initial tasks', async () => {
  const response = await request(app).post('/api/plants').send({
    name: '迷迭香',
    species: 'Rosmarinus officinalis',
    date: '2026-04-28',
    schedules: { water: 5, fertilize: 14, prune: 30, repot: 365 },
  })

  expect(response.status).toBe(201)
  expect(response.body.aiProfile.advice.length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm --prefix server run test -- tests/plants-ai.test.js`

Expected: FAIL，说明 `POST /api/plants` 还未生成 `aiProfile` 或首批任务。

- [ ] **Step 3: 给 AI 服务增加资料生成方法**

```js
async function generatePlantProfile(payload) {
  const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      response_format: { type: 'json_object' },
      messages: [...],
    }),
  })

  return normalizePlantProfile(await parseProviderResponse(response))
}
```

- [ ] **Step 4: 在 `POST /api/plants` 中串行生成完整植物**

```js
const aiProfile = await aiService.generatePlantProfile(plantDraft)
const plant = {
  id: Date.now(),
  ...plantDraft,
  carePlan: {
    lastWateredAt: plantDraft.date || '',
    lastFertilizedAt: '',
    lastPrunedAt: '',
    lastRepottedAt: '',
  },
  aiProfile,
}
```

- [ ] **Step 5: 新增植物后同步生成首批自动任务**

```js
const initialTasks = plantCareService.buildInitialTasksForPlant(plant)
await store.write('plants', [...plants, plant])
await store.write('tasks', [...tasks, ...initialTasks])
```

- [ ] **Step 6: AI 失败时整个新增失败**

```js
if (!aiProfile) {
  response.status(502).json({ message: 'AI 建档失败，植物未保存' })
  return
}
```

- [ ] **Step 7: 跑植物 AI 相关测试**

Run: `npm --prefix server run test -- tests/plants-ai.test.js`

Expected: PASS，验证新增植物时 AI 建档成功才落库。

- [ ] **Step 8: 提交植物 AI 建档层**

```powershell
git add server/src/services/aiChatService.js server/src/routes/plants.js server/src/app.js server/tests/plants-ai.test.js
git commit -m "feat: generate plant profile with ai on creation"
```

### Task 3: PlantsPage 重构为全局详情视图

**Files:**
- Create: `D:\PlaneHelper\frontend\src\components\plants\PlantListView.vue`
- Create: `D:\PlaneHelper\frontend\src\components\plants\PlantDetailView.vue`
- Create: `D:\PlaneHelper\frontend\src\components\plants\PlantGrowthTimeline.vue`
- Modify: `D:\PlaneHelper\frontend\src\pages\PlantsPage.vue`
- Modify: `D:\PlaneHelper\frontend\src\composables\useGardenData.js`
- Modify: `D:\PlaneHelper\frontend\src\style.css`
- Test: `D:\PlaneHelper\frontend\src\pages\PlantsPage.test.js`

- [ ] **Step 1: 先写页面切换测试**

```js
it('shows plant detail view instead of modal when a plant is selected', async () => {
  const wrapper = mount(PlantsPage)
  await wrapper.find('[data-plant-card="1"]').trigger('click')
  expect(wrapper.text()).toContain('生长记录')
  expect(wrapper.find('.overlay').exists()).toBe(false)
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm --prefix frontend run test -- src/pages/PlantsPage.test.js`

Expected: FAIL，说明页面仍然依赖详情弹窗。

- [ ] **Step 3: 把列表视图和详情视图拆成独立组件**

```vue
<template>
  <section>
    <PlantListView v-if="!selectedPlant" ... />
    <PlantDetailView v-else :plant="selectedPlant" :logs="selectedPlantLogs" @back="selectedPlantId = null" />
  </section>
</template>
```

- [ ] **Step 4: 将 AI 建议、FAQ、养护计划和生长记录全部移入详情视图**

```vue
<PlantDetailView
  :plant="selectedPlant"
  :logs="selectedPlantLogs"
  :tasks="plantTasks"
  @save="savePlantDetail"
  @ask-ai="openAiGardener"
/>
```

- [ ] **Step 5: 在 `useGardenData` 中补齐返回值**

```js
async function createPlant(payload, file) {
  // 返回完整 plant，前端新增后可直接跳详情
  const created = await requestJson('/api/plants', { ... })
  await refreshAll()
  return created
}
```

- [ ] **Step 6: 更新样式，删除详情弹窗视觉依赖**

```css
.plant-detail-shell {
  display: grid;
  grid-template-columns: minmax(0, 2fr) 320px;
  gap: 18px;
}
```

- [ ] **Step 7: 跑前端页面测试**

Run: `npm --prefix frontend run test -- src/pages/PlantsPage.test.js`

Expected: PASS，确认植物详情不再使用模态弹窗。

- [ ] **Step 8: 提交植物页面重构**

```powershell
git add frontend/src/components/plants frontend/src/pages/PlantsPage.vue frontend/src/composables/useGardenData.js frontend/src/style.css frontend/src/pages/PlantsPage.test.js
git commit -m "feat: replace plant modal with full detail view"
```

### Task 4: 收缩 ManagePage 并完成联调

**Files:**
- Modify: `D:\PlaneHelper\frontend\src\pages\ManagePage.vue`
- Modify: `D:\PlaneHelper\frontend\src\utils\garden.js`
- Test: `D:\PlaneHelper\frontend\src\pages\ManagePage.test.js`

- [ ] **Step 1: 先写 `ManagePage` 不再展示日志的失败测试**

```js
it('does not render log creation controls in manage page', async () => {
  const wrapper = mount(ManagePage)
  expect(wrapper.text()).not.toContain('记录今日观察')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npm --prefix frontend run test -- src/pages/ManagePage.test.js`

Expected: FAIL，说明页面仍包含日志录入区域。

- [ ] **Step 3: 删除日志录入与时间线模块，保留任务和日历**

```vue
<div class="three-col">
  <TaskColumn ... />
  <CalendarColumn ... />
  <SeasonTipsColumn ... />
</div>
```

- [ ] **Step 4: 清理 `utils/garden.js` 中供旧页面使用的杂项文案和状态辅助**

```js
export function taskTypeLabel(type) {
  return TASK_META[type]?.label || type
}
```

- [ ] **Step 5: 跑前端测试与整仓构建**

Run: `npm --prefix frontend run test`

Expected: PASS

Run: `npm test`

Expected: PASS

Run: `npm run build`

Expected: PASS

- [ ] **Step 6: 本地场景验证**

Run: `npm run dev`

Expected:
- 点击植物进入全局详情页
- 完成浇水任务后，植物详情“生长记录”出现系统日志
- 修改浇水周期后，下一次浇水日期同步调整
- 新增植物时等待 AI 建档成功后才出现在列表中

- [ ] **Step 7: 提交前端联调收尾**

```powershell
git add frontend/src/pages/ManagePage.vue frontend/src/utils/garden.js
git commit -m "feat: align manage page with plant detail workflow"
```

