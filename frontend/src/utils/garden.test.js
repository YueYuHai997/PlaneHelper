import { describe, expect, it } from 'vitest'
import { buildSeasonPlantHint, parseAiAnalysisSections } from './garden'

describe('buildSeasonPlantHint', () => {
  it('根据春季和蔬果标签生成更具体的季节提示', () => {
    const hint = buildSeasonPlantHint(
      {
        name: '圣女果',
        tags: ['蔬果', '喜阳'],
        schedules: { water: 5 },
      },
      new Date('2026-04-29T10:00:00.000Z'),
    )

    expect(hint.name).toBe('春季')
    expect(hint.desc).toContain('蔬果类植物')
    expect(hint.desc).toContain('当前浇水周期约为每 5 天一次')
  })

  it('标签缺失时退回到通用季节提示', () => {
    const hint = buildSeasonPlantHint(
      {
        name: '未知植物',
        tags: [],
        schedules: {},
      },
      new Date('2026-12-20T10:00:00.000Z'),
    )

    expect(hint.name).toBe('冬季')
    expect(hint.desc).toContain('大多数植物进入缓慢期')
  })
})

describe('parseAiAnalysisSections', () => {
  it('将 AI 分析文本解析为可折叠展示所需的分节结构', () => {
    const sections = parseAiAnalysisSections(`### 总体判断： 这株丁香花目前存在异常，需要尽快处理。
### 可能问题或风险：
1. 叶片感染真菌病害。
2. 通风与湿度管理存在隐患。
### 处理建议：
1. 先修剪病叶。
2. 改善通风并喷施杀菌剂。`)

    expect(sections.summary).toContain('存在异常')
    expect(sections.sections).toHaveLength(3)
    expect(sections.sections[0].title).toBe('总体判断')
    expect(sections.sections[1].items).toHaveLength(2)
    expect(sections.sections[2].items[0]).toContain('先修剪病叶')
  })

  it('会清理 AI 文本中的 Markdown 强调标记', () => {
    const sections = parseAiAnalysisSections(`### 总体判断： 这株丁香花目前**存在异常**，并非完全健康。`)

    expect(sections.summary).toContain('存在异常')
    expect(sections.summary).not.toContain('**')
    expect(sections.sections[0].paragraphs[0]).toBe('这株丁香花目前存在异常，并非完全健康。')
  })
})
