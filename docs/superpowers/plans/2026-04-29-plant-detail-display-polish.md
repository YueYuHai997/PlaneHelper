# Plant Detail Display Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将植物详情页中的 AI 建议与常见问题改成只读展示，并统一植物状态标签的三档颜色表现。

**Architecture:** 保持现有植物详情页结构不变，只替换 AI 内容区域的展示方式，并通过 `garden.js` 提供只读展示所需的数据映射。样式集中放在 `style.css`，页面逻辑仍由 `PlantsPage.vue` 驱动，避免扩散改动范围。

**Tech Stack:** Vue 3、Vue Router、Vitest、CSS

---

### Task 1: 锁定页面展示行为测试

**Files:**
- Modify: `frontend/src/pages/PlantsPage.test.js`
- Test: `frontend/src/pages/PlantsPage.test.js`

- [ ] **Step 1: 写失败测试，覆盖只读 AI 展示和状态标签**

```js
it('renders readonly ai content and colored status badge in plant detail', async () => {
  const wrapper = await mountPage()
  await wrapper.get('[data-plant-card="1"]').trigger('click')

  expect(wrapper.text()).toContain('种植建议')
  expect(wrapper.text()).toContain('常见问题')
  expect(wrapper.text()).toContain('保持日照')
  expect(wrapper.text()).toContain('多久浇水？')
  expect(wrapper.findAll('.detail-advice-item').length).toBeGreaterThan(0)
  expect(wrapper.findAll('.faq-display-card').length).toBeGreaterThan(0)
  expect(wrapper.find('.faq-edit-list').exists()).toBe(false)
  expect(wrapper.find('textarea.detail-textarea').exists()).toBe(false)
  expect(wrapper.find('.detail-badges .badge-green').exists()).toBe(true)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm --prefix frontend run test -- src/pages/PlantsPage.test.js`
Expected: FAIL，原因是页面仍然渲染 `textarea` 和 FAQ 编辑区，且缺少 `.detail-advice-item` / `.faq-display-card`。

- [ ] **Step 3: 如测试文件存在乱码，先重写为 UTF-8 干净版本并保留现有回归用例**

```js
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import PlantsPage from './PlantsPage.vue'
import { useGardenData } from '../composables/useGardenData'
```

- [ ] **Step 4: 再次运行测试，确认依旧因为新行为未实现而失败**

Run: `npm --prefix frontend run test -- src/pages/PlantsPage.test.js`
Expected: FAIL，断言命中新加的只读类名缺失。

### Task 2: 实现只读 AI 内容展示

**Files:**
- Modify: `frontend/src/pages/PlantsPage.vue`
- Modify: `frontend/src/utils/garden.js`

- [ ] **Step 1: 在 `garden.js` 增加只读展示辅助数据**

```js
export function buildAdviceCards(plant, season) {
  const icons = ['🌿', '☀️', '💧', '🪴', '✨']
  return buildAdviceLines(plant, season).map((text, index) => ({
    id: `${plant?.id || 'plant'}-advice-${index}`,
    icon: icons[index % icons.length],
    text,
  }))
}
```

- [ ] **Step 2: 在 `PlantsPage.vue` 中改用 `selectedPlantAdviceCards` 只读渲染建议**

```js
const selectedPlantAdviceCards = computed(() =>
  selectedPlant.value ? buildAdviceCards(selectedPlant.value, season) : [],
)
```

```vue
<div class="card-bd detail-advice-list">
  <div
    v-for="item in selectedPlantAdviceCards"
    :key="item.id"
    class="detail-advice-item"
  >
    <span class="detail-advice-icon">{{ item.icon }}</span>
    <p class="detail-advice-text">{{ item.text }}</p>
  </div>
</div>
```

- [ ] **Step 3: 移除 FAQ 编辑逻辑，只保留只读展示**

```vue
<div class="card-bd faq-display-list">
  <article
    v-for="(item, index) in selectedPlantFaq"
    :key="`${selectedPlant.id}-faq-${index}`"
    class="faq-display-card"
  >
    <h4 class="faq-display-question">{{ item.q }}</h4>
    <p class="faq-display-answer">{{ item.a }}</p>
  </article>
</div>
```

- [ ] **Step 4: 删除不再使用的状态和方法**

```js
// 删除
const faqDraft = ref([])
function addFaqItem() {}
function removeFaqItem() {}

// 从 syncDetailDraft 中删除 adviceText / faqDraft 赋值
```

- [ ] **Step 5: 运行单测确认通过**

Run: `npm --prefix frontend run test -- src/pages/PlantsPage.test.js`
Expected: PASS

### Task 3: 统一状态标签颜色与内容样式

**Files:**
- Modify: `frontend/src/style.css`

- [ ] **Step 1: 为建议块和 FAQ 卡片添加紧凑只读样式**

```css
.detail-advice-list {
  display: grid;
  gap: 12px;
}

.detail-advice-item {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #e7efda;
  border-radius: 14px;
  background: linear-gradient(180deg, #fcfdf8 0%, #f6faef 100%);
}
```

```css
.faq-display-list {
  display: grid;
  gap: 12px;
}

.faq-display-card {
  padding: 16px 18px;
  border: 1px solid #e7efda;
  border-radius: 14px;
  background: #fbfcf8;
}
```

- [ ] **Step 2: 细化三档状态颜色**

```css
.badge-green {
  background: #e7f6df;
  color: #2f6b18;
}

.badge-amber {
  background: #fff3da;
  color: #9a6500;
}

.badge-red {
  background: #fde3df;
  color: #b53a2f;
}
```

- [ ] **Step 3: 运行前端测试，确认样式改动未影响结构断言**

Run: `npm --prefix frontend run test`
Expected: PASS

### Task 4: 完整验证

**Files:**
- Modify: `frontend/src/pages/PlantsPage.vue`
- Modify: `frontend/src/utils/garden.js`
- Modify: `frontend/src/style.css`
- Modify: `frontend/src/pages/PlantsPage.test.js`

- [ ] **Step 1: 运行前端全量测试**

Run: `npm --prefix frontend run test`
Expected: PASS

- [ ] **Step 2: 运行项目构建**

Run: `npm run build`
Expected: PASS，Vite 正常产出 `frontend/dist`

- [ ] **Step 3: 人工检查植物详情页**

Run: `npm run dev`
Expected:
- “种植建议”显示为只读建议块
- “常见问题”显示为紧凑卡片
- 不再出现 FAQ 编辑按钮和建议输入框
- 植物列表与详情页中的 `健康 / 注意 / 异常` 颜色一致
