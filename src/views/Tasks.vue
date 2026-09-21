<template>
  <!-- Task center page | 任务中心页面 -->
  <div class="min-h-screen h-screen overflow-y-auto bg-[var(--bg-primary)]">
    <!-- Header | 顶部导航 -->
    <AppHeader>
      <template #left>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-colors text-[var(--text-primary)]"
          @click="goHome"
        >
          <n-icon :size="16"><ArrowBackOutline /></n-icon>
          返回
        </button>
      </template>
      <template #right>
        <button
          v-if="finishedCount > 0"
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-colors text-[var(--text-secondary)]"
          @click="handleClearFinished"
        >
          <n-icon :size="16"><TrashBinOutline /></n-icon>
          清空已结束
        </button>
      </template>
    </AppHeader>

    <main class="max-w-4xl mx-auto px-4 py-6">
      <h1 class="text-xl font-bold text-[var(--text-primary)] mb-6">任务中心</h1>

      <!-- Empty state | 空状态 -->
      <div
        v-if="tasks.length === 0"
        class="text-center py-20 bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-color)]"
      >
        <n-icon :size="48" class="text-[var(--text-secondary)] mb-4"><ListOutline /></n-icon>
        <p class="text-[var(--text-secondary)]">还没有生成任务</p>
      </div>

      <!-- Task list | 任务列表 -->
      <div v-else class="space-y-3">
        <div
          v-for="task in tasks"
          :key="task.id"
          class="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)]"
        >
          <!-- Status icon | 状态图标 -->
          <div class="flex-shrink-0">
            <n-spin v-if="task.status === 'running' || task.status === 'polling'" :size="20" />
            <n-icon v-else-if="task.status === 'success'" :size="20" class="text-green-500">
              <CheckmarkCircleOutline />
            </n-icon>
            <n-icon v-else :size="20" class="text-red-500">
              <CloseCircleOutline />
            </n-icon>
          </div>

          <!-- Info | 任务信息 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span
                class="px-1.5 py-0.5 text-xs rounded"
                :class="task.type === 'video'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'"
              >
                {{ task.type === 'video' ? '视频' : '图片' }}
              </span>
              <span class="text-xs text-[var(--text-tertiary)]">{{ task.model }}</span>
              <span class="text-xs text-[var(--text-tertiary)]">·</span>
              <span class="text-xs text-[var(--text-tertiary)]">{{ task.projectName || '未知项目' }}</span>
            </div>
            <p class="text-sm text-[var(--text-primary)] truncate">
              {{ task.prompt || '（无提示词）' }}
            </p>
            <p v-if="task.status === 'failed'" class="text-xs text-red-500 mt-1 truncate">
              {{ task.error }}
            </p>
          </div>

          <!-- Result thumbnail | 结果缩略图 -->
          <div v-if="task.status === 'success' && task.resultUrl" class="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-[var(--bg-tertiary)]">
            <img v-if="task.type === 'image'" :src="task.resultUrl" class="w-full h-full object-cover" />
            <video v-else :src="task.resultUrl" class="w-full h-full object-cover" muted preload="metadata" />
          </div>

          <!-- Time + actions | 时间与操作 -->
          <div class="flex-shrink-0 flex items-center gap-2">
            <span class="text-xs text-[var(--text-tertiary)]">{{ formatTime(task.createdAt) }}</span>
            <button
              v-if="task.projectId"
              class="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors text-[var(--text-secondary)]"
              title="打开项目"
              @click="goToProject(task.projectId)"
            >
              <n-icon :size="16"><OpenOutline /></n-icon>
            </button>
            <button
              class="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors text-[var(--text-secondary)]"
              title="删除记录"
              @click="handleDelete(task.id)"
            >
              <n-icon :size="16"><TrashOutline /></n-icon>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
/**
 * Task center view | 任务中心视图
 * Shows generation task history with status
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon, NSpin } from 'naive-ui'
import {
  ArrowBackOutline,
  ListOutline,
  CheckmarkCircleOutline,
  CloseCircleOutline,
  OpenOutline,
  TrashOutline,
  TrashBinOutline
} from '@vicons/ionicons5'
import AppHeader from '../components/AppHeader.vue'
import { tasks, deleteTask, clearFinishedTasks } from '../stores/tasks'

const router = useRouter()

const finishedCount = computed(() => tasks.value.filter((t) => t.status === 'success' || t.status === 'failed').length)

const formatTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return isToday ? `${hh}:${mm}` : `${date.getMonth() + 1}/${date.getDate()} ${hh}:${mm}`
}

const goHome = () => router.push('/')

const goToProject = (projectId) => {
  router.push(`/canvas/${projectId}`)
}

const handleDelete = (id) => {
  deleteTask(id)
}

const handleClearFinished = () => {
  clearFinishedTasks()
  window.$message?.success('已清空')
}
</script>
