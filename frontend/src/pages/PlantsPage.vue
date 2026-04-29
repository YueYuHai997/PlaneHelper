<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGardenData } from '../composables/useGardenData'
import {
  buildAdviceCards,
  buildFaqItems,
  buildPlanSections,
  buildSeasonPlantHint,
  formatDateLabel,
  getSliderTip,
  nextTaskDate,
  parseAiAnalysisSections,
  plantEmoji,
  statusBadgeClass,
  statusLabel,
  taskIcon,
} from '../utils/garden'

const route = useRoute()
const router = useRouter()
const {
  plants,
  logs,
  loading,
  error,
  createPlant,
  updatePlant,
  regeneratePlantProfile,
  deletePlant,
  createLog,
  askAiAboutLogs,
  getImageUrl,
  getToday,
} = useGardenData()

const defaultAiQuestion = '请根据近一个月的观察记录和图片，判断这株植物目前是否正常，是否存在问题，并给出处理建议。'

const showAddModal = ref(false)
const selectedPlantId = ref(null)
const detailTab = ref('care')
const savingPlant = ref(false)
const savingDetail = ref(false)
const savingLog = ref(false)
const deletingPlant = ref(false)
const regeneratingProfile = ref(false)
const askingAi = ref(false)
const showAiAskBox = ref(false)
const localMessage = ref('')
const photoFile = ref(null)
const logImageFile = ref(null)
const aiQuestion = ref(defaultAiQuestion)

const form = reactive({
  name: '',
  species: '',
  date: getToday(),
  status: 'healthy',
  note: '',
  tags: '',
})

const detailDraft = reactive({
  status: 'healthy',
  note: '',
  water: 3,
  fertilize: 14,
  prune: 30,
  repot: 365,
})

const logForm = reactive({
  date: getToday(),
  text: '',
})

const selectedPlant = computed(() =>
  plants.value.find((plant) => plant.id === selectedPlantId.value) || null,
)

const selectedPlantLogs = computed(() =>
  selectedPlant.value
    ? [...logs.value]
      .filter((log) => log.plant === selectedPlant.value.id)
      .sort((left, right) => right.date.localeCompare(left.date))
    : [],
)

const selectedPlantLogEntries = computed(() =>
  selectedPlantLogs.value.map((log) => ({
    ...log,
    aiDisplay: log.source === 'ai' ? parseAiAnalysisSections(log.text) : null,
  })),
)

const selectedPlantAdviceCards = computed(() =>
  selectedPlant.value ? buildAdviceCards(selectedPlant.value, buildSeasonPlantHint(selectedPlant.value)) : [],
)

const selectedPlantFaq = computed(() =>
  selectedPlant.value ? buildFaqItems(selectedPlant.value) : [],
)

const selectedPlantPlan = computed(() =>
  selectedPlant.value ? buildPlanSections(selectedPlant.value) : [],
)

const seasonHint = computed(() =>
  selectedPlant.value ? buildSeasonPlantHint(selectedPlant.value) : null,
)

const needsAiProfile = computed(() => {
  if (!selectedPlant.value) {
    return false
  }

  const profile = selectedPlant.value.aiProfile
  return !profile
    || !Array.isArray(profile.advice)
    || !profile.advice.length
    || !Array.isArray(profile.faq)
    || !profile.faq.length
    || !profile.plan
    || !profile.plan.summary
    || !profile.plan.water
    || !profile.plan.fertilize
    || !profile.plan.prune
    || !profile.plan.repot
})

function resetForm() {
  form.name = ''
  form.species = ''
  form.date = getToday()
  form.status = 'healthy'
  form.note = ''
  form.tags = ''
  photoFile.value = null
}

function openAddModal() {
  localMessage.value = ''
  showAddModal.value = true
  resetForm()
}

function closeAddModal() {
  showAddModal.value = false
  if (route.query.modal === 'add') {
    router.replace({ name: 'plants' })
  }
}

function openDetail(plant) {
  localMessage.value = ''
  detailTab.value = 'care'
  selectedPlantId.value = plant.id
}

function backToList() {
  localMessage.value = ''
  detailTab.value = 'care'
  selectedPlantId.value = null
  showAiAskBox.value = false
  aiQuestion.value = defaultAiQuestion
}

function syncDetailDraft(plant) {
  if (!plant) {
    return
  }

  detailDraft.status = plant.status
  detailDraft.note = plant.note || ''
  detailDraft.water = plant.schedules?.water ?? 3
  detailDraft.fertilize = plant.schedules?.fertilize ?? 14
  detailDraft.prune = plant.schedules?.prune ?? 30
  detailDraft.repot = plant.schedules?.repot ?? 365
}

async function submitPlant() {
  if (!form.name.trim()) {
    localMessage.value = '请输入植物名称。'
    return
  }

  savingPlant.value = true
  localMessage.value = ''

  try {
    const created = await createPlant(
      {
        name: form.name.trim(),
        species: form.species.trim(),
        date: form.date,
        status: form.status,
        note: form.note.trim(),
        tags: form.tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        schedules: {
          water: 3,
          fertilize: 14,
          prune: 30,
          repot: 365,
        },
      },
      photoFile.value,
    )

    closeAddModal()
    detailTab.value = 'care'
    selectedPlantId.value = created.id
  } catch {
    localMessage.value = error.value || '添加植物失败。'
  } finally {
    savingPlant.value = false
  }
}

async function regenerateProfile() {
  if (!selectedPlant.value) {
    return
  }

  regeneratingProfile.value = true
  localMessage.value = ''

  try {
    await regeneratePlantProfile(selectedPlant.value.id)
    localMessage.value = 'AI 内容已重新生成。'
  } catch {
    localMessage.value = error.value || 'AI 内容重新生成失败。'
  } finally {
    regeneratingProfile.value = false
  }
}

async function removePlant() {
  if (!selectedPlant.value) {
    return
  }

  if (!window.confirm(`确认删除“${selectedPlant.value.name}”吗？关联任务、日志会一起归档删除。`)) {
    return
  }

  deletingPlant.value = true
  localMessage.value = ''

  try {
    await deletePlant(selectedPlant.value.id)
    backToList()
  } catch {
    localMessage.value = error.value || '删除植物失败。'
  } finally {
    deletingPlant.value = false
  }
}

async function saveDetail() {
  if (!selectedPlant.value) {
    return
  }

  savingDetail.value = true
  localMessage.value = ''

  try {
    await updatePlant(selectedPlant.value.id, {
      ...selectedPlant.value,
      status: detailDraft.status,
      note: detailDraft.note.trim(),
      schedules: {
        water: Number(detailDraft.water),
        fertilize: Number(detailDraft.fertilize),
        prune: Number(detailDraft.prune),
        repot: Number(detailDraft.repot),
      },
      aiProfile: selectedPlant.value.aiProfile,
    })
    localMessage.value = '植物详情已保存。'
  } catch {
    localMessage.value = error.value || '保存植物详情失败。'
  } finally {
    savingDetail.value = false
  }
}

async function submitLog() {
  if (!selectedPlant.value || !logForm.text.trim()) {
    localMessage.value = '请输入生长记录内容。'
    return
  }

  savingLog.value = true
  localMessage.value = ''

  try {
    await createLog(
      {
        plant: selectedPlant.value.id,
        date: logForm.date,
        text: logForm.text.trim(),
        source: 'user',
      },
      logImageFile.value,
    )

    logForm.date = getToday()
    logForm.text = ''
    logImageFile.value = null
    localMessage.value = '生长记录已保存。'
  } catch {
    localMessage.value = error.value || '保存生长记录失败。'
  } finally {
    savingLog.value = false
  }
}

function openAiAskBox() {
  localMessage.value = ''
  aiQuestion.value = defaultAiQuestion
  showAiAskBox.value = true
}

function closeAiAskBox() {
  showAiAskBox.value = false
  aiQuestion.value = defaultAiQuestion
}

async function submitAiAsk() {
  if (!selectedPlant.value) {
    return
  }

  if (!aiQuestion.value.trim()) {
    localMessage.value = '请输入要询问 AI 园丁的问题。'
    return
  }

  askingAi.value = true
  localMessage.value = ''

  try {
    await askAiAboutLogs(selectedPlant.value.id, aiQuestion.value.trim())
    closeAiAskBox()
    localMessage.value = 'AI 分析已写入生长记录。'
  } catch {
    localMessage.value = error.value || 'AI 园丁分析失败。'
  } finally {
    askingAi.value = false
  }
}

watch(
  () => route.query.modal,
  (value) => {
    if (value === 'add') {
      openAddModal()
    }
  },
  { immediate: true },
)

watch(selectedPlant, (plant) => {
  syncDetailDraft(plant)
  detailTab.value = 'care'
  showAiAskBox.value = false
  aiQuestion.value = defaultAiQuestion
}, { immediate: true })
</script>

<template>
  <section>
    <template v-if="!selectedPlant">
      <div class="page-toolbar">
        <div class="toolbar-note">共 <span>{{ plants.length }}</span> 株植物</div>
        <button class="btn btn-primary" type="button" @click="openAddModal()">+ 添加植物</button>
      </div>

      <div class="plant-grid">
        <button
          v-for="plant in plants"
          :key="plant.id"
          class="pc"
          type="button"
          :data-plant-card="plant.id"
          @click="openDetail(plant)"
        >
          <div class="pc-photo-wrap">
            <img v-if="plant.photo" class="pc-photo-img" :src="getImageUrl(plant.photo)" :alt="plant.name" />
            <div v-else class="pc-photo-placeholder">{{ plantEmoji(plant) }}</div>
            <div class="pc-dot" :class="`s-${plant.status}`"></div>
          </div>
          <div class="pc-info">
            <div class="pc-name">{{ plant.name }}</div>
            <div class="pc-species">{{ plant.species || '未填写品种' }}</div>
            <div class="pc-date">🗓 {{ formatDateLabel(plant.date) }}</div>
            <div class="pc-tags">
              <span v-for="tag in plant.tags" :key="tag" class="tag">{{ tag }}</span>
              <span class="tag" :class="statusBadgeClass(plant.status)">
                {{ statusLabel(plant.status) }}
              </span>
            </div>
          </div>
        </button>
      </div>
    </template>

    <template v-else>
      <div class="detail-page-head">
        <button class="btn btn-ghost" type="button" @click="backToList()">← 返回植物列表</button>
        <div class="detail-head-actions">
          <div class="toolbar-note">详情页中的修改会直接保存到本地数据。</div>
          <button
            class="btn btn-ghost btn-danger-soft"
            data-delete-plant
            type="button"
            :disabled="deletingPlant || loading"
            @click="removePlant()"
          >
            {{ deletingPlant ? '删除中...' : '删除植物' }}
          </button>
        </div>
      </div>

      <div v-if="localMessage" class="notice detail-status-notice">{{ localMessage }}</div>

      <div class="plant-detail-shell">
        <div class="plant-detail-main">
          <div class="card detail-hero-card">
            <div class="card-bd plant-detail-hero">
              <div class="detail-photo-wrap detail-photo-large">
                <img v-if="selectedPlant.photo" :src="getImageUrl(selectedPlant.photo)" :alt="selectedPlant.name" />
                <span v-else>{{ plantEmoji(selectedPlant) }}</span>
              </div>
              <div class="plant-detail-summary">
                <div class="detail-name">{{ selectedPlant.name }}</div>
                <div class="detail-species">{{ selectedPlant.species || '未填写学名' }}</div>
                <div class="detail-badges">
                  <span class="badge badge-green">🌱 {{ formatDateLabel(selectedPlant.date) }} 种植</span>
                  <span class="badge" :class="statusBadgeClass(selectedPlant.status)">{{ statusLabel(selectedPlant.status) }}</span>
                  <span v-for="tag in selectedPlant.tags" :key="tag" class="badge">{{ tag }}</span>
                </div>
                <p class="plant-detail-note">{{ selectedPlant.note || '暂无备注。' }}</p>
              </div>
            </div>
          </div>

          <div v-if="needsAiProfile" class="card">
            <div class="card-bd detail-regenerate-notice">
              <div>
                <div class="card-title">AI 内容不完整</div>
                <p class="toolbar-note">这株植物可能是旧版本服务创建的，当前建议、常见问题或养护计划没有完整生成。</p>
              </div>
              <button
                class="btn btn-primary"
                type="button"
                :disabled="regeneratingProfile || loading"
                @click="regenerateProfile()"
              >
                {{ regeneratingProfile ? '正在生成...' : '重新生成 AI 内容' }}
              </button>
            </div>
          </div>

          <div class="detail-tab-bar">
            <button
              class="detail-tab-btn"
              :class="{ active: detailTab === 'care' }"
              data-detail-tab="care"
              type="button"
              @click="detailTab = 'care'"
            >
              养护建议
            </button>
            <button
              class="detail-tab-btn"
              :class="{ active: detailTab === 'logs' }"
              data-detail-tab="logs"
              type="button"
              @click="detailTab = 'logs'"
            >
              生长记录
            </button>
          </div>

          <template v-if="detailTab === 'care'">
            <div class="card">
              <div class="card-hd card-hd-soft">
                <div>
                  <span class="card-title detail-section-title care-display-title">种植建议</span>
                  <p class="detail-section-subtitle">根据当前植物资料与季节信息生成的照护建议。</p>
                </div>
              </div>
              <div class="card-bd detail-advice-list">
                <div
                  v-for="item in selectedPlantAdviceCards"
                  :key="item.id"
                  class="detail-advice-item"
                >
                  <span class="detail-advice-icon">{{ item.icon }}</span>
                  <p class="detail-advice-text">{{ item.text }}</p>
                </div>
                <div v-if="!selectedPlantAdviceCards.length" class="empty-state">
                  <div class="empty-txt">暂时还没有可展示的种植建议。</div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-hd card-hd-soft">
                <div>
                  <span class="card-title detail-section-title care-display-title">常见问题</span>
                  <p class="detail-section-subtitle">把最常见的照护疑问整理成可直接查阅的说明。</p>
                </div>
              </div>
              <div class="card-bd faq-display-list">
                <article
                  v-for="(item, index) in selectedPlantFaq"
                  :key="`${selectedPlant.id}-faq-${index}`"
                  class="faq-display-card"
                >
                  <h4 class="faq-display-question">{{ item.q }}</h4>
                  <p class="faq-display-answer">{{ item.a }}</p>
                </article>
                <div v-if="!selectedPlantFaq.length" class="empty-state">
                  <div class="empty-txt">暂时还没有可展示的常见问题。</div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-hd card-hd-soft">
                <div>
                  <span class="card-title detail-section-title care-display-title">养护计划</span>
                  <p class="detail-section-subtitle">以当前周期和 AI 建议汇总成的长期养护安排。</p>
                </div>
              </div>
              <div class="card-bd plan-display-grid">
                <article
                  v-for="item in selectedPlantPlan"
                  :key="item.key"
                  class="plan-display-card"
                >
                  <div class="plan-display-label">{{ item.title }}</div>
                  <p class="plan-display-text">{{ item.content }}</p>
                </article>
                <div v-if="!selectedPlantPlan.length" class="empty-state plan-display-empty">
                  <div class="empty-txt">暂时还没有可展示的养护计划。</div>
                </div>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="card">
              <div class="card-hd card-hd-soft">
                <div class="detail-log-head">
                  <div>
                    <span class="card-title detail-section-title">生长记录</span>
                    <p class="detail-section-subtitle">记录植物日常观察、图片和系统自动生成的养护事件。</p>
                  </div>
                  <button
                    class="btn btn-sm detail-ai-trigger"
                    data-ask-ai
                    type="button"
                    :disabled="askingAi || loading"
                    @click="openAiAskBox()"
                  >
                    {{ askingAi ? '分析中...' : '询问AI园丁' }}
                  </button>
                </div>
              </div>
              <div class="card-bd">
                <div class="log-add-form">
                  <div class="log-add-header" data-log-header>
                    <div class="log-add-title">记录今日观察</div>
                    <div class="log-date-column" data-log-date-column>
                      <input v-model="logForm.date" class="form-ctrl log-date-input" type="date" />
                    </div>
                  </div>
                  <div class="log-add-body" data-log-layout>
                    <textarea
                      v-model="logForm.text"
                      class="log-textarea log-textarea-fixed log-equal-height"
                      data-log-textarea
                      placeholder="记录状态、变化、问题或收获..."
                    />
                    <label class="log-upload-label log-upload-panel log-equal-height" data-log-upload>
                      <span class="log-upload-icon">📷</span>
                      <span class="log-upload-text">上传图片</span>
                      <span class="log-file-name">{{ logImageFile?.name || '点击选择图片' }}</span>
                      <input type="file" accept="image/*" style="display: none" @change="logImageFile = $event.target.files?.[0] || null" />
                    </label>
                  </div>
                  <div class="log-add-actions" data-log-actions>
                    <button
                      class="btn btn-sm detail-ai-trigger log-submit-btn log-submit-btn-ai"
                      data-log-submit
                      type="button"
                      :disabled="savingLog"
                      @click="submitLog()"
                    >
                      <span class="log-submit-icon">📝</span>
                      <span>记录</span>
                    </button>
                  </div>
                </div>

                <div v-if="showAiAskBox" class="ai-ask-card">
                  <div class="log-add-title">询问AI园丁</div>
                  <p class="detail-section-subtitle ai-ask-tip">系统会自动整理近 30 天观察记录和图片，一并提交给 Doubao 分析。</p>
                  <textarea
                    v-model="aiQuestion"
                    class="log-textarea ai-ask-textarea"
                    data-ai-question
                    placeholder="请输入想让 AI 园丁重点分析的问题..."
                  />
                  <div class="ai-ask-actions">
                    <button class="btn btn-ghost btn-sm" type="button" :disabled="askingAi" @click="closeAiAskBox()">取消</button>
                    <button
                      class="btn btn-primary btn-sm"
                      data-ai-submit
                      type="button"
                      :disabled="askingAi"
                      @click="submitAiAsk()"
                    >
                      {{ askingAi ? '提交中...' : '发送分析' }}
                    </button>
                  </div>
                </div>

                <div class="log-timeline">
                  <div v-for="log in selectedPlantLogEntries" :key="log.id" class="log-entry">
                    <div class="log-dot"></div>
                    <div class="log-date">
                      {{ formatDateLabel(log.date) }}
                      <span class="badge" :class="log.source === 'system' ? 'badge-amber' : log.source === 'ai' ? 'badge-sky' : 'badge-green'">
                        {{ log.source === 'system' ? '系统记录' : log.source === 'ai' ? 'AI 分析' : '观察记录' }}
                      </span>
                    </div>
                    <details
                      v-if="log.source === 'ai' && log.aiDisplay"
                      class="ai-log-entry"
                      :data-ai-log-entry="log.id"
                      open
                    >
                      <summary class="ai-log-summary">
                        <span class="ai-log-summary-title">AI 分析结论</span>
                        <span class="ai-log-summary-text">{{ log.aiDisplay.summary }}</span>
                      </summary>
                      <div class="ai-log-body">
                        <article
                          v-for="(section, index) in log.aiDisplay.sections"
                          :key="`${log.id}-section-${index}`"
                          class="ai-log-section"
                        >
                          <h4 class="ai-log-section-title">{{ section.title }}</h4>
                          <p
                            v-for="(paragraph, paragraphIndex) in section.paragraphs"
                            :key="`${log.id}-section-${index}-paragraph-${paragraphIndex}`"
                            class="ai-log-section-text"
                          >
                            {{ paragraph }}
                          </p>
                          <ul v-if="section.items.length" class="ai-log-list">
                            <li
                              v-for="(item, itemIndex) in section.items"
                              :key="`${log.id}-section-${index}-item-${itemIndex}`"
                            >
                              {{ item }}
                            </li>
                          </ul>
                        </article>
                      </div>
                    </details>
                    <div v-else class="log-text">{{ log.text }}</div>
                    <div v-if="log.imgs?.length" class="log-imgs">
                      <img
                        v-for="imagePath in log.imgs"
                        :key="imagePath"
                        class="log-thumb"
                        :src="getImageUrl(imagePath)"
                        alt="日志图片"
                      />
                    </div>
                  </div>
                  <div v-if="!selectedPlantLogEntries.length" class="empty-state">
                    <div class="empty-txt">还没有任何生长记录。</div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <aside class="plant-detail-side">
          <div v-if="seasonHint" class="card season-tip-card">
            <div class="card-bd">
              <div class="season-banner" :class="seasonHint.cls">
                <span class="season-icon">{{ seasonHint.icon }}</span>
                <div>
                  <div class="season-name">{{ seasonHint.name }}养护提示</div>
                  <div class="season-desc">{{ seasonHint.desc }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-hd">
              <span class="card-title">状态与周期</span>
            </div>
            <div class="card-bd">
              <div class="form-row">
                <label class="form-label">当前状态</label>
                <select v-model="detailDraft.status" class="form-ctrl">
                  <option value="healthy">健康</option>
                  <option value="warning">注意</option>
                  <option value="danger">异常</option>
                </select>
              </div>

              <div class="slider-row">
                <div class="slider-header">
                  <span class="slider-label">{{ taskIcon('water') }} 浇水周期</span>
                  <span class="slider-val">每 {{ detailDraft.water }} 天</span>
                </div>
                <input v-model="detailDraft.water" class="care-range" min="1" max="60" type="range" />
                <div class="slider-sub">{{ getSliderTip('water', Number(detailDraft.water)) }}</div>
              </div>

              <div class="slider-row">
                <div class="slider-header">
                  <span class="slider-label">{{ taskIcon('fertilize') }} 施肥周期</span>
                  <span class="slider-val">每 {{ detailDraft.fertilize }} 天</span>
                </div>
                <input v-model="detailDraft.fertilize" class="care-range" min="1" max="60" type="range" />
                <div class="slider-sub">{{ getSliderTip('fertilize', Number(detailDraft.fertilize)) }}</div>
              </div>

              <div class="slider-row">
                <div class="slider-header">
                  <span class="slider-label">{{ taskIcon('prune') }} 修剪周期</span>
                  <span class="slider-val">每 {{ detailDraft.prune }} 天</span>
                </div>
                <input v-model="detailDraft.prune" class="care-range" min="1" max="90" type="range" />
                <div class="slider-sub">{{ getSliderTip('prune', Number(detailDraft.prune)) }}</div>
              </div>

              <div class="slider-row">
                <div class="slider-header">
                  <span class="slider-label">{{ taskIcon('repot') }} 换盆周期</span>
                  <span class="slider-val">每 {{ detailDraft.repot }} 天</span>
                </div>
                <input v-model="detailDraft.repot" class="care-range" min="1" max="730" type="range" />
                <div class="slider-sub">{{ getSliderTip('repot', Number(detailDraft.repot)) }}</div>
              </div>

              <div class="form-row">
                <label class="form-label">备注</label>
                <textarea v-model="detailDraft.note" class="form-ctrl detail-textarea-sm" />
              </div>

              <button class="btn btn-primary side-save-btn" type="button" :disabled="savingDetail || loading" @click="saveDetail()">
                保存调整
              </button>
            </div>
          </div>

          <div class="card">
            <div class="card-hd">
              <span class="card-title">下一次任务</span>
            </div>
            <div class="card-bd next-task-list">
              <div class="next-task-row">
                <span>{{ taskIcon('water') }} 下次浇水</span>
                <strong>{{ formatDateLabel(nextTaskDate(selectedPlant, 'water')) || '待生成' }}</strong>
              </div>
              <div class="next-task-row">
                <span>{{ taskIcon('fertilize') }} 下次施肥</span>
                <strong>{{ formatDateLabel(nextTaskDate(selectedPlant, 'fertilize')) || '待生成' }}</strong>
              </div>
              <div class="next-task-row">
                <span>{{ taskIcon('prune') }} 下次修剪</span>
                <strong>{{ formatDateLabel(nextTaskDate(selectedPlant, 'prune')) || '待生成' }}</strong>
              </div>
              <div class="next-task-row">
                <span>{{ taskIcon('repot') }} 下次换盆</span>
                <strong>{{ formatDateLabel(nextTaskDate(selectedPlant, 'repot')) || '待生成' }}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </template>

    <div v-if="showAddModal" class="overlay open" @click.self="closeAddModal()">
      <div class="modal">
        <div class="modal-title">添加新植物</div>
        <div class="form-row">
          <label class="form-label">植物照片</label>
          <div class="photo-upload">
            <input type="file" accept="image/*" @change="photoFile = $event.target.files?.[0] || null" />
            <div v-if="!photoFile">
              <div class="photo-icon">📷</div>
              <div class="photo-hint">点击上传真实照片</div>
            </div>
            <div v-else>
              <div class="photo-icon">✓</div>
              <div class="photo-hint">{{ photoFile.name }}</div>
            </div>
          </div>
        </div>

        <div class="form-2col">
          <div>
            <label class="form-label">植物名称 *</label>
            <input v-model="form.name" class="form-ctrl" placeholder="如：迷迭香" />
          </div>
          <div>
            <label class="form-label">品种 / 学名</label>
            <input v-model="form.species" class="form-ctrl" placeholder="如：Rosmarinus officinalis" />
          </div>
        </div>

        <div class="form-2col">
          <div>
            <label class="form-label">种植日期</label>
            <input v-model="form.date" class="form-ctrl" type="date" />
          </div>
          <div>
            <label class="form-label">健康状态</label>
            <select v-model="form.status" class="form-ctrl">
              <option value="healthy">健康</option>
              <option value="warning">注意</option>
              <option value="danger">异常</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <label class="form-label">标签</label>
          <input v-model="form.tags" class="form-ctrl" placeholder="如：香草, 喜阳" />
        </div>

        <div class="form-row">
          <label class="form-label">备注</label>
          <textarea
            v-model="form.note"
            class="form-ctrl"
            style="height: 72px; resize: vertical"
            placeholder="种植位置、特别注意事项..."
          />
        </div>

        <div class="notice">
          提交后会先调用 Doubao 自动生成种植建议、常见问题和养护计划，生成成功后才会保存植物。
        </div>

        <div v-if="localMessage" class="notice">{{ localMessage }}</div>

        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" @click="closeAddModal()">取消</button>
          <button class="btn btn-primary" type="button" :disabled="savingPlant" @click="submitPlant()">添加植物</button>
        </div>
      </div>
    </div>
  </section>
</template>
