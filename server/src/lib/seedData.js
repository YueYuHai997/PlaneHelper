function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function createSeedPlants() {
  return [
    {
      id: 1,
      name: '圣女果',
      species: 'Solanum lycopersicum',
      photo: '',
      date: '2025-03-10',
      status: 'healthy',
      note: '阳台，需充足日照',
      tags: ['蔬果', '需日照'],
      schedules: { water: 3, fertilize: 14, prune: 30, repot: 365 },
      carePlan: {
        lastWateredAt: '2025-03-10',
        lastFertilizedAt: '2025-03-20',
        lastPrunedAt: '',
        lastRepottedAt: '2025-03-10',
      },
      aiProfile: {
        advice: [
          '保持每天 6 小时以上光照，旺长期注意通风。',
          '浇水前先观察表层盆土，避免长期潮湿。',
        ],
        faq: [
          { q: '叶片发黄怎么办？', a: '先检查浇水频率，再确认是否缺光或排水不畅。' },
          { q: '多久施肥一次？', a: '生长季通常每两周一次薄肥即可。' },
        ],
        plan: {
          summary: '旺长期重视日照、补水和定期薄肥。',
          water: '见干见湿，约 3 天一次',
          fertilize: '每 14 天一次薄肥',
          prune: '发现徒长或老叶时及时修剪',
          repot: '根系顶盆时换盆',
        },
        generatedAt: '2026-04-28T00:00:00.000Z',
      },
    },
    {
      id: 2,
      name: '薄荷',
      species: 'Mentha spicata',
      photo: '',
      date: '2025-02-20',
      status: 'healthy',
      note: '窗台，保持通风',
      tags: ['香草', '喜湿'],
      schedules: { water: 2, fertilize: 21, prune: 14, repot: 180 },
      carePlan: {
        lastWateredAt: '2025-02-20',
        lastFertilizedAt: '',
        lastPrunedAt: '2025-04-20',
        lastRepottedAt: '2025-02-20',
      },
      aiProfile: {
        advice: [
          '保持湿润但不积水，夏季需要更频繁观察盆土。',
          '经常摘心有助于分枝，让株型更饱满。',
        ],
        faq: [
          { q: '为什么薄荷长得细长？', a: '通常是光照不足或长期未摘心导致。' },
          { q: '可以经常采摘吗？', a: '可以，适度采摘反而有助于分枝。' },
        ],
        plan: {
          summary: '薄荷生长快，重点是补水和摘心。',
          water: '约 2 天一次，炎热天气更勤观察',
          fertilize: '每 3 周一次薄肥',
          prune: '每 2 周检查并摘心',
          repot: '半年左右检查根系空间',
        },
        generatedAt: '2026-04-28T00:00:00.000Z',
      },
    },
    {
      id: 3,
      name: '绿萝',
      species: 'Epipremnum aureum',
      photo: '',
      date: '2024-11-05',
      status: 'warning',
      note: '室内散射光，注意黄叶',
      tags: ['室内', '耐阴'],
      schedules: { water: 7, fertilize: 30, prune: 30, repot: 365 },
      carePlan: {
        lastWateredAt: '2026-04-21',
        lastFertilizedAt: '2026-04-01',
        lastPrunedAt: '',
        lastRepottedAt: '2024-11-05',
      },
      aiProfile: {
        advice: [
          '保持明亮散射光，避免长期放在过暗角落。',
          '黄叶增多时先检查盆土湿度和根系透气性。',
        ],
        faq: [
          { q: '绿萝黄叶怎么处理？', a: '先减小浇水频率并清理积水，再观察光照条件。' },
          { q: '能直接晒太阳吗？', a: '不建议暴晒，明亮散射光更稳定。' },
        ],
        plan: {
          summary: '重点控制水分和环境稳定性。',
          water: '约 7 天一次，视温度调整',
          fertilize: '每月一次薄肥',
          prune: '徒长时修剪，保留节点',
          repot: '每年检查一次根系',
        },
        generatedAt: '2026-04-28T00:00:00.000Z',
      },
    },
  ];
}

function createSeedTasks() {
  const today = offsetDate(0);

  return [
    { id: 101, type: 'water', plant: 1, date: today, done: false, note: '深度浇水', source: 'auto', completedAt: '' },
    { id: 102, type: 'fertilize', plant: 2, date: today, done: false, note: '液肥稀释', source: 'auto', completedAt: '' },
    { id: 103, type: 'prune', plant: 3, date: offsetDate(1), done: false, note: '修剪黄叶', source: 'auto', completedAt: '' },
  ];
}

function createSeedLogs() {
  return [
    {
      id: 201,
      plant: 1,
      date: offsetDate(-1),
      text: '圣女果开花，状态稳定，今天追肥。',
      imgs: [],
      source: 'user',
    },
    {
      id: 202,
      plant: 3,
      date: offsetDate(-2),
      text: '发现少量黄叶，已减少浇水频率。',
      imgs: [],
      source: 'user',
    },
  ];
}

module.exports = {
  createSeedPlants,
  createSeedTasks,
  createSeedLogs,
};
