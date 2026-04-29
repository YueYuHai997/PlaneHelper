<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useGardenData } from '../composables/useGardenData'
import {
  TASK_META,
  formatDateLabel,
  getSeasonInfo,
  plantEmoji,
  taskTypeLabel,
} from '../utils/garden'

const { plants, tasks, toggleTask, createTask, getToday } = useGardenData()

const season = getSeasonInfo()
const today = getToday()

const showTaskModal = ref(false)
const saving = ref(false)
const selectedCalDate = ref(today)
const calendarDate = ref(new Date())

const taskForm = reactive({
  type: 'water',
  plant: '',
  date: today,
  note: '',
})

const todayTasks = computed(() =>
  tasks.value.filter((task) => task.date === today).sort((left, right) => Number(left.done) - Number(right.done)),
)

const upcomingTasks = computed(() =>
  tasks.value
    .filter((task) => !task.done && task.date !== today)
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, 8),
)

const calendarLabel = computed(() =>
  calendarDate.value.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
  }),
)

const calendarDays = computed(() => {
  const year = calendarDate.value.getFullYear()
  const month = calendarDate.value.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevDays = new Date(year, month, 0).getDate()
  const days = []

  for (let index = 0; index < firstDay; index += 1) {
    days.push({
      key: `prev-${index}`,
      label: prevDays - firstDay + index + 1,
      date: null,
      isOther: true,
      isToday: false,
      hasTask: false,
      isSelected: false,
    })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    days.push({
      key: date,
      label: day,
      date,
      isOther: false,
      isToday: date === today,
      hasTask: tasks.value.some((task) => task.date === date && !task.done),
      isSelected: date === selectedCalDate.value,
    })
  }

  return days
})

const dayTasks = computed(() =>
  tasks.value.filter((task) => task.date === selectedCalDate.value),
)

function plantById(id) {
  return plants.value.find((plant) => plant.id === id)
}

function openTaskModal() {
  showTaskModal.value = true
  taskForm.type = 'water'
  taskForm.plant = plants.value[0] ? String(plants.value[0].id) : ''
  taskForm.date = today
  taskForm.note = ''
}

function closeTaskModal() {
  showTaskModal.value = false
}

async function submitTask() {
  if (!taskForm.plant) {
    return
  }

  saving.value = true
  try {
    await createTask({
      type: taskForm.type,
      plant: Number(taskForm.plant),
      date: taskForm.date,
      note: taskForm.note.trim(),
      done: false,
      source: 'manual',
    })
    closeTaskModal()
  } finally {
    saving.value = false
  }
}

function selectDate(date) {
  if (!date) {
    return
  }
  selectedCalDate.value = date
}

function changeMonth(offset) {
  const next = new Date(calendarDate.value)
  next.setMonth(next.getMonth() + offset)
  calendarDate.value = next
}

watch(
  plants,
  (items) => {
    if (!taskForm.plant && items[0]) {
      taskForm.plant = String(items[0].id)
    }
  },
  { immediate: true },
)
</script>

<template>
  <section>
    <div class="three-col manage-shell">
      <div>
        <div class="card">
          <div class="card-hd">
            <span class="card-title">今日任务</span>
            <button class="btn btn-ghost btn-sm" type="button" @click="openTaskModal()">+ 手动调整</button>
          </div>
          <div class="card-bd">
            <div v-if="todayTasks.length">
              <div v-for="task in todayTasks" :key="task.id" class="task-item">
                <button class="task-check" :class="{ done: task.done }" type="button" @click="toggleTask(task.id)">
                  {{ task.done ? '✓' : '' }}
                </button>
                <div class="task-body">
                  <div class="task-title" :class="{ 'task-done-text': task.done }">
                    {{ TASK_META[task.type]?.icon || '🔎' }}
                    {{ taskTypeLabel(task.type) }}
                    <span v-if="task.note"> · {{ task.note }}</span>
                  </div>
                  <div class="task-meta">
                    {{ plantById(task.plant) ? `${plantEmoji(plantById(task.plant))} ${plantById(task.plant).name}` : '未指定植物' }}
                    · {{ task.date === today ? '今天' : formatDateLabel(task.date) }}
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <div class="empty-icon">✓</div>
              <div class="empty-txt">今天没有待办任务</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-hd">
            <span class="card-title">近期任务</span>
          </div>
          <div class="card-bd">
            <div v-if="upcomingTasks.length">
              <div v-for="task in upcomingTasks" :key="task.id" class="task-item">
                <div class="task-check static">{{ TASK_META[task.type]?.icon || '🔎' }}</div>
                <div class="task-body">
                  <div class="task-title">{{ taskTypeLabel(task.type) }}</div>
                  <div class="task-meta">
                    {{ plantById(task.plant) ? `${plantEmoji(plantById(task.plant))} ${plantById(task.plant).name}` : '未指定植物' }}
                    · {{ formatDateLabel(task.date) }}
                    <span v-if="task.note"> · {{ task.note }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="empty-state compact">
              <div class="empty-txt">当前没有后续任务</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="card">
          <div class="card-hd">
            <span class="card-title">日历规划</span>
          </div>
          <div class="card-bd">
            <div class="mini-cal">
              <div class="mini-cal-hd">
                <button class="mini-cal-nav" type="button" @click="changeMonth(-1)">‹</button>
                <span class="mini-cal-label">{{ calendarLabel }}</span>
                <button class="mini-cal-nav" type="button" @click="changeMonth(1)">›</button>
              </div>
              <div class="mini-cal-grid">
                <div v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day" class="mini-day-hd">{{ day }}</div>
                <button
                  v-for="day in calendarDays"
                  :key="day.key"
                  class="mini-day"
                  :class="{
                    today: day.isToday,
                    other: day.isOther,
                    'has-task': day.hasTask,
                    selected: day.isSelected && !day.isToday,
                  }"
                  type="button"
                  @click="selectDate(day.date)"
                >
                  {{ day.label }}
                </button>
              </div>
            </div>

            <div class="divider"></div>
            <div class="calendar-day-label">{{ formatDateLabel(selectedCalDate) }} 的任务</div>
            <div v-if="dayTasks.length">
              <div v-for="task in dayTasks" :key="task.id" class="calendar-task-row">
                <span>{{ TASK_META[task.type]?.icon || '🔎' }}</span>
                <span class="calendar-task-main">
                  {{ taskTypeLabel(task.type) }}
                  <span v-if="task.note"> · {{ task.note }}</span>
                  <span v-if="plantById(task.plant)"> · {{ plantById(task.plant).name }}</span>
                </span>
                <span class="calendar-task-status">{{ task.done ? '已完成' : '待执行' }}</span>
              </div>
            </div>
            <div v-else class="empty-state compact">
              <div class="empty-txt">当天没有任务</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="card season-tip-card">
          <div class="card-bd">
            <div class="season-banner" :class="season.cls">
              <span class="season-icon">{{ season.icon }}</span>
              <div>
                <div class="season-name">{{ season.name }}养护提示</div>
                <div class="season-desc">{{ season.desc }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-hd">
            <span class="card-title">当前规则</span>
          </div>
          <div class="card-bd">
            <div class="ai-content">
              <div class="ai-line">同一植物同一任务类型只保留一条未完成待办。</div>
              <div class="ai-line">完成浇水、施肥、修剪、换盆后，系统会自动补写生长记录。</div>
              <div class="ai-line">手动调整任务会替换原有同类型待办，避免重复提醒。</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showTaskModal" class="overlay open" @click.self="closeTaskModal()">
      <div class="modal">
        <div class="modal-title">添加养护任务</div>

        <div class="form-2col">
          <div>
            <label class="form-label">任务类型</label>
            <select v-model="taskForm.type" class="form-ctrl">
              <option value="water">💧 浇水</option>
              <option value="fertilize">🪴 施肥</option>
              <option value="prune">✂️ 修剪</option>
              <option value="repot">🪴 换盆</option>
              <option value="spray">🌫 喷雾</option>
              <option value="check">🔎 检查</option>
            </select>
          </div>
          <div>
            <label class="form-label">植物</label>
            <select v-model="taskForm.plant" class="form-ctrl">
              <option disabled value="">请选择植物</option>
              <option v-for="plant in plants" :key="plant.id" :value="String(plant.id)">
                {{ plantEmoji(plant) }} {{ plant.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-2col">
          <div>
            <label class="form-label">日期</label>
            <input v-model="taskForm.date" class="form-ctrl" type="date" />
          </div>
          <div>
            <label class="form-label">备注</label>
            <input v-model="taskForm.note" class="form-ctrl" placeholder="例如：提前补水" />
          </div>
        </div>

        <div class="notice">
          同类型任务只保留一条待办。保存后会替换该植物原有的同类型未完成任务。
        </div>

        <div class="modal-actions">
          <button class="btn btn-ghost" type="button" @click="closeTaskModal()">取消</button>
          <button class="btn btn-primary" type="button" :disabled="saving" @click="submitTask()">添加任务</button>
        </div>
      </div>
    </div>
  </section>
</template>
