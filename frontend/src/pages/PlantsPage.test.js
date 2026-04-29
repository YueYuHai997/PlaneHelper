// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import PlantsPage from './PlantsPage.vue'
import { useGardenData } from '../composables/useGardenData'

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/plants', name: 'plants', component: PlantsPage }],
  })

  await router.push('/plants')
  await router.isReady()

  return mount(PlantsPage, {
    global: {
      plugins: [router],
    },
  })
}

describe('PlantsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-29T10:00:00.000Z'))

    const garden = useGardenData()
    garden.loading.value = false
    garden.error.value = ''
    garden.regeneratePlantProfile = vi.fn().mockResolvedValue({})
    garden.plants.value = [
      {
        id: 1,
        name: '圣女果',
        species: 'Solanum lycopersicum',
        photo: '',
        date: '2026-04-20',
        status: 'healthy',
        note: '阳台种植',
        tags: ['蔬果', '喜阳'],
        schedules: { water: 5, fertilize: 14, prune: 30, repot: 365 },
        carePlan: {
          lastWateredAt: '2026-04-20',
          lastFertilizedAt: '',
          lastPrunedAt: '',
          lastRepottedAt: '',
        },
        aiProfile: {
          advice: ['保持日照', '注意通风'],
          faq: [{ q: '多久浇水？', a: '观察盆土后决定。' }],
          plan: {
            summary: '稳定通风',
            water: '5 天一次',
            fertilize: '14 天一次',
            prune: '按长势修剪',
            repot: '根系顶盆时换盆',
          },
          generatedAt: '2026-04-28T00:00:00.000Z',
        },
      },
    ]
    garden.logs.value = [
      {
        id: 11,
        plant: 1,
        date: '2026-04-28',
        text: '已完成浇水，系统已同步下一次浇水任务。',
        imgs: [],
        source: 'system',
      },
    ]
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('点击植物后显示全局详情视图而不是弹窗', async () => {
    const wrapper = await mountPage()

    await wrapper.get('[data-plant-card="1"]').trigger('click')

    expect(wrapper.text()).toContain('养护建议')
    expect(wrapper.text()).toContain('下一次任务')
    expect(wrapper.find('.overlay').exists()).toBe(false)
  })

  it('AI 内容缺失时显示重新生成入口', async () => {
    const garden = useGardenData()
    garden.plants.value = [
      {
        id: 2,
        name: '虎皮蓝花',
        species: '',
        photo: '',
        date: '2026-04-29',
        status: 'healthy',
        note: '',
        tags: [],
        schedules: { water: 3, fertilize: 14, prune: 30, repot: 365 },
      },
    ]
    garden.logs.value = []

    const wrapper = await mountPage()
    await wrapper.get('[data-plant-card="2"]').trigger('click')

    expect(wrapper.text()).toContain('重新生成 AI 内容')
    expect(wrapper.text()).toContain('AI 内容不完整')
  })

  it('默认打开养护建议分页，并将养护计划渲染为只读卡片', async () => {
    const wrapper = await mountPage()

    await wrapper.get('[data-plant-card="1"]').trigger('click')

    expect(wrapper.get('[data-detail-tab="care"]').classes()).toContain('active')
    expect(wrapper.text()).toContain('种植建议')
    expect(wrapper.text()).toContain('常见问题')
    expect(wrapper.text()).toContain('养护计划')
    expect(wrapper.text()).toContain('稳定通风')
    expect(wrapper.findAll('.detail-advice-item')).toHaveLength(2)
    expect(wrapper.findAll('.faq-display-card')).toHaveLength(1)
    expect(wrapper.findAll('.plan-display-card')).toHaveLength(5)
    expect(wrapper.find('.plan-grid').exists()).toBe(false)
    expect(wrapper.findAll('.care-display-title')).toHaveLength(3)
  })

  it('切换到生长记录分页后显示日志内容和录入区', async () => {
    const wrapper = await mountPage()

    await wrapper.get('[data-plant-card="1"]').trigger('click')
    await wrapper.get('[data-detail-tab="logs"]').trigger('click')

    expect(wrapper.get('[data-detail-tab="logs"]').classes()).toContain('active')
    expect(wrapper.text()).toContain('记录今日观察')
    expect(wrapper.text()).toContain('已完成浇水，系统已同步下一次浇水任务。')
    expect(wrapper.text()).not.toContain('常见问题')
  })

  it('将季节提示放在状态与周期上方，并根据植物标签生成文案', async () => {
    const wrapper = await mountPage()

    await wrapper.get('[data-plant-card="1"]').trigger('click')

    const sideText = wrapper.find('.plant-detail-side').text()
    expect(sideText.indexOf('春季养护提示')).toBeLessThan(sideText.indexOf('状态与周期'))
    expect(wrapper.find('.season-desc').text()).toContain('蔬果类植物')
    expect(wrapper.find('.season-desc').text()).toContain('当前浇水周期约为每 5 天一次')
  })

  it('确认后删除植物并返回列表页', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
      const requestUrl = String(url)
      if (options.method === 'DELETE' && requestUrl.endsWith('/api/plants/1')) {
        return {
          ok: true,
          status: 204,
          json: async () => null,
        }
      }

      if (requestUrl.endsWith('/api/plants') || requestUrl.endsWith('/api/tasks') || requestUrl.endsWith('/api/logs')) {
        return {
          ok: true,
          status: 200,
          json: async () => [],
        }
      }

      throw new Error(`Unexpected fetch: ${requestUrl}`)
    }))

    const wrapper = await mountPage()

    await wrapper.get('[data-plant-card="1"]').trigger('click')
    await wrapper.get('[data-delete-plant]').trigger('click')
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-detail-tab="care"]').exists()).toBe(false)
    expect(wrapper.find('[data-plant-card="1"]').exists()).toBe(false)
  })

  it('在生长记录页可以向 AI 园丁提问，并将分析结果追加到时间线', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
      const requestUrl = String(url)

      if (options.method === 'POST' && requestUrl.endsWith('/api/ai/analyze-logs')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            answer: 'AI 分析：植株整体正常，建议继续观察叶片边缘变化。',
            provider: 'doubao',
            model: 'doubao-1-5-vision-lite-250315',
            log: {
              id: 99,
              plant: 1,
              date: '2026-04-29',
              text: 'AI 分析：植株整体正常，建议继续观察叶片边缘变化。',
              imgs: [],
              source: 'ai',
            },
          }),
        }
      }

      if (requestUrl.endsWith('/api/logs')) {
        return {
          ok: true,
          status: 200,
          json: async () => ([
            {
              id: 99,
              plant: 1,
              date: '2026-04-29',
              text: 'AI 分析：植株整体正常，建议继续观察叶片边缘变化。',
              imgs: [],
              source: 'ai',
            },
            {
              id: 11,
              plant: 1,
              date: '2026-04-28',
              text: '已完成浇水，系统已同步下一次浇水任务。',
              imgs: [],
              source: 'system',
            },
          ]),
        }
      }

      throw new Error(`Unexpected fetch: ${requestUrl}`)
    }))

    const wrapper = await mountPage()

    await wrapper.get('[data-plant-card="1"]').trigger('click')
    await wrapper.get('[data-detail-tab="logs"]').trigger('click')
    await wrapper.get('[data-ask-ai]').trigger('click')

    expect(wrapper.get('[data-ai-question]').element.value).toContain('近一个月')

    await wrapper.get('[data-ai-question]').setValue('请根据近一个月记录判断植物是否正常，并给出建议。')
    await wrapper.get('[data-ai-submit]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('AI 分析：植株整体正常，建议继续观察叶片边缘变化。')
    expect(wrapper.text()).toContain('AI 分析')
  })

  it('AI 分析记录以可折叠分节面板展示', async () => {
    const garden = useGardenData()
    garden.logs.value = [
      {
        id: 77,
        plant: 1,
        date: '2026-04-29',
        text: `### 总体判断： 这株丁香花目前存在异常，并非完全健康。
### 可能问题或风险：
1. 叶片感染真菌病害。
2. 通风与湿度管理存在隐患。
### 处理建议：
1. 先修剪病叶。
2. 改善通风并喷施杀菌剂。`,
        imgs: [],
        source: 'ai',
      },
    ]

    const wrapper = await mountPage()

    await wrapper.get('[data-plant-card="1"]').trigger('click')
    await wrapper.get('[data-detail-tab="logs"]').trigger('click')

    const accordion = wrapper.get('[data-ai-log-entry="77"]')
    expect(accordion.attributes('open')).toBeDefined()
    expect(accordion.text()).toContain('总体判断')
    expect(accordion.text()).toContain('可能问题或风险')
    expect(accordion.text()).toContain('先修剪病叶')
    expect(wrapper.find('.ai-log-summary').text()).toContain('存在异常')
  })
})
