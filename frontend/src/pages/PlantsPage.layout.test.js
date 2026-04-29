// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
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

describe('PlantsPage layout polish', () => {
  beforeEach(() => {
    const garden = useGardenData()
    garden.loading.value = false
    garden.error.value = ''
    garden.plants.value = [
      {
        id: 1,
        name: '薄荷',
        species: 'Mentha',
        photo: '',
        date: '2026-04-20',
        status: 'healthy',
        note: '窗边养护',
        tags: ['香草'],
        schedules: { water: 5, fertilize: 14, prune: 30, repot: 365 },
        aiProfile: {
          advice: ['保持通风'],
          faq: [{ q: '多久浇水？', a: '观察盆土湿度后决定。' }],
          plan: {
            summary: '保持通风',
            water: '5天一次',
            fertilize: '14天一次',
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
        text: '叶片状态稳定。',
        imgs: [],
        source: 'user',
      },
    ]
  })

  it('uses stronger visual hierarchy for AI ask and log upload controls', async () => {
    const wrapper = await mountPage()

    await wrapper.get('[data-plant-card="1"]').trigger('click')
    await wrapper.get('[data-detail-tab="logs"]').trigger('click')

    expect(wrapper.get('[data-ask-ai]').classes()).toContain('detail-ai-trigger')
    expect(wrapper.get('[data-log-header]').classes()).toContain('log-add-header')
    expect(wrapper.get('[data-log-layout]').classes()).toContain('log-add-body')
    expect(wrapper.get('[data-log-actions]').classes()).toContain('log-add-actions')
    expect(wrapper.get('[data-log-date-column]').classes()).toContain('log-date-column')
    expect(wrapper.get('[data-log-upload]').classes()).toContain('log-upload-panel')
    expect(wrapper.get('[data-log-upload]').classes()).toContain('log-equal-height')
    expect(wrapper.get('[data-log-textarea]').classes()).toContain('log-textarea-fixed')
    expect(wrapper.get('[data-log-textarea]').classes()).toContain('log-equal-height')
    expect(wrapper.get('[data-log-submit]').classes()).toContain('log-submit-btn-ai')
    expect(wrapper.get('[data-log-submit]').text()).toContain('📝')
  })
})
