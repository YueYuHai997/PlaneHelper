export const TASK_META = {
  water: { icon: '💧', label: '浇水', cls: 'dot-water' },
  fertilize: { icon: '🧴', label: '施肥', cls: 'dot-fert' },
  prune: { icon: '✂️', label: '修剪', cls: 'dot-prune' },
  repot: { icon: '🪴', label: '换盆', cls: 'dot-prune' },
  spray: { icon: '🌫️', label: '喷雾', cls: 'dot-water' },
  check: { icon: '🔎', label: '检查', cls: 'dot-prune' },
}

const ADVICE_ICONS = ['🌿', '☀️', '💧', '🪴', '✨']

const TAG_PATTERNS = [
  { key: 'vegetable', patterns: ['蔬果', '果蔬', '番茄', 'tomato', '辣椒', 'pepper'] },
  { key: 'herb', patterns: ['香草', 'herb', '薄荷', 'mint', '迷迭香', 'rosemary', '罗勒', 'basil'] },
  { key: 'sun', patterns: ['喜阳', '全日照', 'sun', 'sunny'] },
  { key: 'shade', patterns: ['耐阴', '散射光', 'shade', 'shadow'] },
  { key: 'indoor', patterns: ['室内', 'indoor'] },
  { key: 'humid', patterns: ['喜湿', '湿润', 'humid', 'moist'] },
  { key: 'drought', patterns: ['耐旱', '干燥', 'succulent', 'cactus'] },
]

const SEASON_RULES = {
  spring: {
    vegetable: '春季生长提速，蔬果类植物适合逐步增加光照、通风和薄肥，避免徒长。',
    herb: '春季是香草类快速恢复的阶段，适合轻修剪促分枝，并维持稳定日照。',
    sun: '春季光照增强，可逐步延长见光时间，但新叶期仍要避免中午暴晒。',
    shade: '春季新叶萌发时，保持柔和散射光与通风，避免突然搬到强光位。',
    indoor: '春季室内植物要注意通风和采光变化，防止闷湿环境引发黄叶。',
    humid: '春季温度回升后蒸发加快，保持盆土微湿即可，避免长期积水。',
    drought: '春季虽进入生长期，但耐旱植物仍要少量多次补水，先看盆土再浇。',
  },
  summer: {
    vegetable: '夏季蔬果类植物需重点关注高温和通风，午后可适度遮阴防晒伤。',
    herb: '夏季香草蒸腾快，保持晨间补水和通风，避免午后闷热导致倒伏。',
    sun: '夏季喜阳植物也要提防正午灼伤，可把强光暴晒改为分时见光。',
    shade: '夏季耐阴植物更怕闷热，保持空气流动比单纯增加浇水更重要。',
    indoor: '夏季室内环境易闷热，注意通风和湿度，避免空调直吹叶片。',
    humid: '夏季喜湿植物可适当提高空气湿度，但仍要确保花盆排水顺畅。',
    drought: '夏季耐旱植物进入高温期时要减少暴晒后的立即浇透，避免闷根。',
  },
  autumn: {
    vegetable: '秋季蔬果类植物适合稳住通风和养分供应，帮助花果和枝叶顺利过渡。',
    herb: '秋季香草长势趋稳，可轻度修剪老枝，减少无效消耗。',
    sun: '秋季光照变柔，可逐步增加见光时间，帮助枝叶保持紧凑。',
    shade: '秋季耐阴植物应避免因光照减弱而过度控水，维持均衡节奏即可。',
    indoor: '秋季室内通风条件转弱时，注意叶面清洁和病虫害观察。',
    humid: '秋季湿度变化明显，喜湿植物应改为按盆土状态补水，避免夜间过湿。',
    drought: '秋季耐旱植物进入缓和期，可拉长补水间隔，避免秋凉后烂根。',
  },
  winter: {
    vegetable: '冬季蔬果类植物生长放慢，优先保温与补光，施肥频率应明显降低。',
    herb: '冬季香草进入缓慢期，减少修剪和施肥，保持干爽通风更稳妥。',
    sun: '冬季可把喜阳植物放到更明亮的位置，利用有限日照维持状态。',
    shade: '冬季耐阴植物更怕低温积水，控水比追求生长更重要。',
    indoor: '冬季室内植物要避开冷风和暖气直吹，维持稳定温差。',
    humid: '冬季喜湿植物要减少频繁浇水，优先通过环境湿度而非盆土积水保湿。',
    drought: '冬季耐旱植物应尽量少浇水，等盆土明显干燥后再少量补水。',
  },
}

export function getSeasonInfo(date = new Date()) {
  const month = date.getMonth()
  if (month >= 2 && month <= 4) {
    return {
      key: 'spring',
      name: '春季',
      icon: '🌱',
      cls: 's-spring',
      desc: '生长旺季，适合逐步增加浇水和薄肥，同时留意虫害。',
    }
  }
  if (month >= 5 && month <= 7) {
    return {
      key: 'summer',
      name: '夏季',
      icon: '☀️',
      cls: 's-summer',
      desc: '高温时重点关注通风、遮阴和水分蒸发速度。',
    }
  }
  if (month >= 8 && month <= 10) {
    return {
      key: 'autumn',
      name: '秋季',
      icon: '🍂',
      cls: 's-autumn',
      desc: '逐步降低施肥频率，为换季和休眠做准备。',
    }
  }
  return {
    key: 'winter',
    name: '冬季',
    icon: '❄️',
    cls: 's-winter',
    desc: '大多数植物进入缓慢期，减少浇水并注意保温。',
  }
}

function collectPlantSignals(plant) {
  const text = [
    ...(Array.isArray(plant?.tags) ? plant.tags : []),
    plant?.name || '',
    plant?.species || '',
    plant?.note || '',
  ]
    .join(' ')
    .toLowerCase()

  const signals = new Set()

  for (const rule of TAG_PATTERNS) {
    if (rule.patterns.some((pattern) => text.includes(pattern.toLowerCase()))) {
      signals.add(rule.key)
    }
  }

  return signals
}

function buildWaterRhythmNote(plant) {
  const waterDays = Number(plant?.schedules?.water || 0)
  if (!Number.isFinite(waterDays) || waterDays <= 0) {
    return ''
  }

  if (waterDays <= 2) {
    return ` 当前浇水节奏约为每 ${waterDays} 天一次，仍建议以盆土表层状态决定是否补水。`
  }
  if (waterDays <= 5) {
    return ` 当前浇水周期约为每 ${waterDays} 天一次，保持见干见湿会更稳。`
  }
  return ` 当前浇水间隔偏长，建议每次补水前先确认盆土已经明显变干。`
}

export function buildSeasonPlantHint(plant, date = new Date()) {
  const season = getSeasonInfo(date)
  const signals = collectPlantSignals(plant)
  const rules = SEASON_RULES[season.key]
  const priority = ['vegetable', 'herb', 'humid', 'drought', 'sun', 'shade', 'indoor']
  const matchedKey = priority.find((key) => signals.has(key))
  const baseText = matchedKey ? rules[matchedKey] : season.desc

  return {
    ...season,
    desc: `${baseText}${buildWaterRhythmNote(plant)}`,
  }
}

export function statusLabel(status) {
  if (status === 'healthy') return '健康'
  if (status === 'warning') return '注意'
  return '异常'
}

export function statusBadgeClass(status) {
  if (status === 'healthy') return 'badge-green'
  if (status === 'warning') return 'badge-amber'
  return 'badge-red'
}

export function healthScore(status) {
  if (status === 'healthy') return 86
  if (status === 'warning') return 52
  return 24
}

export function healthColor(status) {
  if (status === 'healthy') return 'var(--g400)'
  if (status === 'warning') return 'var(--a400)'
  return 'var(--r400)'
}

export function formatDateLabel(value) {
  if (!value) return ''
  return value.replace(/-/g, '/')
}

export function plantEmoji(plant) {
  const name = `${plant?.name || ''}${plant?.species || ''}`.toLowerCase()
  if (name.includes('番茄') || name.includes('tomato')) return '🍅'
  if (name.includes('薄荷') || name.includes('mentha')) return '🌿'
  if (name.includes('绿萝') || name.includes('epipremnum')) return '🪴'
  if (name.includes('迷迭香') || name.includes('rosemary')) return '🌱'
  return '🌼'
}

export function getSliderTip(key, value) {
  if (key === 'water') {
    if (value <= 2) return '补水频率较高，适合喜湿或小盆植物。'
    if (value <= 5) return '常规浇水节奏，适合大多数生长期植物。'
    return '浇水间隔较长，适合耐旱或低光环境。'
  }
  if (key === 'fertilize') {
    if (value <= 7) return '施肥较勤，建议使用低浓度薄肥。'
    if (value <= 21) return '常规施肥节奏，适合家庭栽培。'
    return '施肥频率较低，适合缓慢生长期。'
  }
  if (key === 'prune') {
    if (value <= 14) return '修剪较勤，有助于分枝和控形。'
    if (value <= 45) return '修剪频率适中，利于长期维护。'
    return '修剪较少，适合慢生长或造型稳定的植物。'
  }
  if (value <= 90) return '换盆偏勤，适合生长快的小盆植物。'
  if (value <= 365) return '换盆节奏常规，适合大多数盆栽。'
  return '换盆间隔较长，适合稳定大型盆栽。'
}

export function buildAdviceLines(plant, season) {
  if (plant?.aiProfile?.advice?.length) {
    return plant.aiProfile.advice
  }

  return [
    `${season.icon} 当前为${season.name}，重点参考：${season.desc}`,
    plant?.note || '保持稳定光照、通风与排水。',
  ]
}

export function buildAdviceCards(plant, season) {
  return buildAdviceLines(plant, season).map((text, index) => ({
    id: `${plant?.id || 'plant'}-advice-${index}`,
    icon: ADVICE_ICONS[index % ADVICE_ICONS.length],
    text,
  }))
}

export function buildFaqItems(plant) {
  if (plant?.aiProfile?.faq?.length) {
    return plant.aiProfile.faq
  }

  return [
    {
      q: `${plant?.name || '植物'}叶片发黄怎么办？`,
      a: '优先检查浇水、排水和光照变化。',
    },
  ]
}

export function buildPlanSections(plant) {
  if (plant?.aiProfile?.plan) {
    return [
      { key: 'summary', title: '整体策略', content: plant.aiProfile.plan.summary },
      { key: 'water', title: '浇水建议', content: plant.aiProfile.plan.water },
      { key: 'fertilize', title: '施肥建议', content: plant.aiProfile.plan.fertilize },
      { key: 'prune', title: '修剪建议', content: plant.aiProfile.plan.prune },
      { key: 'repot', title: '换盆建议', content: plant.aiProfile.plan.repot },
    ]
  }

  return []
}

function normalizeAiLine(line) {
  return String(line || '')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
}

function pushAiSection(sections, title, lines) {
  const cleanedLines = lines.map(normalizeAiLine).filter(Boolean)
  if (!title && !cleanedLines.length) {
    return
  }

  const items = []
  const paragraphs = []

  for (const line of cleanedLines) {
    if (/^[-*]\s+/.test(line) || /^\d+[.)、]\s*/.test(line)) {
      items.push(line.replace(/^[-*]\s+/, '').replace(/^\d+[.)、]\s*/, '').trim())
    } else {
      paragraphs.push(line)
    }
  }

  sections.push({
    title: title || '分析说明',
    paragraphs,
    items,
  })
}

export function parseAiAnalysisSections(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(normalizeAiLine)
    .filter(Boolean)

  const sections = []
  let currentTitle = ''
  let currentLines = []

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s*([^：:]+?)(?:[：:]\s*(.*))?$/)
    if (headingMatch) {
      pushAiSection(sections, currentTitle, currentLines)
      currentTitle = headingMatch[1].trim()
      currentLines = headingMatch[2] ? [headingMatch[2].trim()] : []
      continue
    }

    currentLines.push(line)
  }

  pushAiSection(sections, currentTitle, currentLines)

  const summarySection = sections[0]
  const summary = [
    ...(summarySection?.paragraphs || []),
    ...(summarySection?.items || []),
  ].join(' ')

  return {
    summary: summary || '点击展开查看 AI 分析详情。',
    sections,
  }
}

export function taskTypeLabel(type) {
  return TASK_META[type]?.label || type
}

export function nextTaskDate(plant, type) {
  const taskKeyMap = {
    water: 'lastWateredAt',
    fertilize: 'lastFertilizedAt',
    prune: 'lastPrunedAt',
    repot: 'lastRepottedAt',
  }
  const careField = taskKeyMap[type]
  const schedule = Number(plant?.schedules?.[type] || 0)
  const baseDate = plant?.carePlan?.[careField] || plant?.date

  if (!baseDate || !schedule) {
    return ''
  }

  const date = new Date(`${baseDate}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + schedule)
  return date.toISOString().slice(0, 10)
}

export const UI_ICONS = {
  overview: '\uD83E\uDDED',
  water: '\uD83D\uDCA7',
  fertilize: '\uD83E\uDDF4',
  prune: '\u2702\uFE0F',
  repot: '\uD83E\uDEB4',
  spray: '\uD83C\uDF27\uFE0F',
  check: '\uD83D\uDD0D',
  photo: '\uD83D\uDCF7',
}

export function taskIcon(type) {
  return UI_ICONS[type] || TASK_META[type]?.icon || '\uD83D\uDDD2\uFE0F'
}
