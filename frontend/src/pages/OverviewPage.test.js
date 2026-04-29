// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import OverviewPage from './OverviewPage.vue'
import { useGardenData } from '../composables/useGardenData'

function mountPage() {
  return mount(OverviewPage, {
    global: {
      stubs: {
        RouterLink: {
          template: '<a><slot /></a>',
        },
      },
    },
  })
}

describe('OverviewPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-29T10:00:00.000Z'))

    const garden = useGardenData()
    garden.plants.value = [
      {
        id: 1,
        name: '丁香花',
        species: 'Syringa',
        photo: '',
        date: '2026-04-01',
        status: 'warning',
        note: '',
        tags: ['花卉'],
        schedules: { water: 5, fertilize: 14, prune: 30, repot: 365 },
      },
    ]
    garden.tasks.value = [
      { id: 11, plant: 1, type: 'repot', date: '2026-04-29', done: false, note: '' },
      { id: 12, plant: 1, type: 'water', date: '2026-04-29', done: true, note: '' },
    ]
    garden.logs.value = [
      { id: 1, plant: 1, date: '2026-04-29', text: '最近一次观察，叶片状态稳定。', imgs: ['/uploads/a.png'], source: 'user' },
      { id: 2, plant: 1, date: '2026-04-28', text: 'AI 分析：忽略这条。', imgs: [], source: 'ai' },
      { id: 3, plant: 1, date: '2026-04-27', text: '完成浇水，状态稳定。', imgs: ['/uploads/b.png'], source: 'system' },
      { id: 4, plant: 1, date: '2026-04-26', text: '观察到新芽萌发。', imgs: [], source: 'user' },
      { id: 5, plant: 1, date: '2026-04-25', text: '土壤稍干，已补水。', imgs: [], source: 'user' },
      { id: 6, plant: 1, date: '2026-04-24', text: '叶片颜色正常。', imgs: [], source: 'user' },
      { id: 7, plant: 1, date: '2026-04-23', text: '这条应被截断。', imgs: [], source: 'user' },
    ]
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('最近动态不显示 AI 记录，只显示最近 5 条并带图片缩略图', () => {
    const wrapper = mountPage()

    const entries = wrapper.findAll('[data-overview-log-entry]')
    expect(entries).toHaveLength(5)
    expect(wrapper.text()).not.toContain('AI 分析：忽略这条。')
    expect(wrapper.text()).not.toContain('这条应被截断。')
    expect(wrapper.findAll('[data-overview-log-image]').length).toBe(2)
  })

  it('今日养护中的换盆任务使用稳定图标映射', () => {
    const wrapper = mountPage()
    const taskText = wrapper.find('.task-title').text()

    expect(taskText).toContain('🪴')
  })
})
