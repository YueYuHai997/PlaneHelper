// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ManagePage from './ManagePage.vue'
import { useGardenData } from '../composables/useGardenData'

describe('ManagePage', () => {
  beforeEach(() => {
    const garden = useGardenData()
    garden.plants.value = [
      {
        id: 1,
        name: '圣女果',
        species: 'Solanum lycopersicum',
        photo: '',
        date: '2026-04-20',
        status: 'healthy',
        note: '',
        tags: ['蔬果'],
        schedules: { water: 5, fertilize: 14, prune: 30, repot: 365 },
        carePlan: {
          lastWateredAt: '2026-04-20',
          lastFertilizedAt: '',
          lastPrunedAt: '',
          lastRepottedAt: '',
        },
        aiProfile: {
          advice: ['保持日照'],
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
    garden.tasks.value = []
  })

  it('does not render log creation controls in manage page', () => {
    const wrapper = mount(ManagePage)
    expect(wrapper.text()).not.toContain('记录今日观察')
    expect(wrapper.text()).not.toContain('生长日志')
  })
})
