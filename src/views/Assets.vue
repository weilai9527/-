<template>
  <!-- Asset library page | 素材库页面 -->
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
    </AppHeader>

    <main class="max-w-7xl mx-auto px-4 py-6">
      <!-- Title + filters | 标题与筛选 -->
      <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 class="text-xl font-bold text-[var(--text-primary)]">素材库</h1>
        <div class="flex items-center gap-2">
          <!-- Search | 搜索 -->
          <div class="relative">
            <n-icon :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              <SearchOutline />
            </n-icon>
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索提示词 / 项目名..."
              class="pl-9 pr-3 py-1.5 text-sm rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--accent-color)] w-56"
            />
          </div>
          <!-- Type filter | 类型筛选 -->
          <div class="flex rounded-lg border border-[var(--border-color)] overflow-hidden">
            <button
              v-for="opt in typeOptions"
              :key="opt.key"
              class="px-3 py-1.5 text-sm transition-colors"
              :class="typeFilter === opt.key
                ? 'bg-[var(--accent-color)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'"
              @click="typeFilter = opt.key"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Empty state | 空状态 -->
      <div
        v-if="filteredAssets.length === 0"
        class="text-center py-20 bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-color)]"
      >
        <n-icon :size="48" class="text-[var(--text-secondary)] mb-4"><ImagesOutline /></n-icon>
        <p class="text-[var(--text-secondary)]">
          {{ searchKeyword || typeFilter !== 'all' ? '没有匹配的素材' : '还没有生成任何素材，去画布创作吧' }}
        </p>
      </div>

      <!-- Asset grid | 素材网格 -->
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div
          v-for="asset in filteredAssets"
          :key="asset.key"
          class="group bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] overflow-hidden hover:border-[var(--accent-color)] transition-colors cursor-pointer"
          @click="previewAsset = asset"
        >
          <!-- Thumbnail | 缩略图 -->
          <div class="aspect-square bg-[var(--bg-tertiary)] relative overflow-hidden">
            <img
              v-if="asset.type === 'image'"
              :src="asset.url"
              :alt="asset.prompt"
              class="w-full h-full object-cover"
              loading="lazy"
            />
            <video
              v-else
              :src="asset.url"
              class="w-full h-full object-cover"
              muted
              preload="metadata"
            />
            <!-- Type badge | 类型标记 -->
            <span
              class="absolute top-2 left-2 px-1.5 py-0.5 text-xs rounded bg-black/50 text-white flex items-center gap-1"
            >
              <n-icon :size="12">
                <VideocamOutline v-if="asset.type === 'video'" />
                <ImageOutline v-else />
              </n-icon>
              {{ asset.type === 'video' ? '视频' : '图片' }}
            </span>
          </div>
          <!-- Info | 信息 -->
          <div class="p-2.5">
            <p class="text-xs text-[var(--text-primary)] line-clamp-2 mb-1.5 min-h-[2rem]">
              {{ asset.prompt || '（无提示词）' }}
            </p>
            <div class="flex items-center justify-between">
              <span class="text-xs text-[var(--text-tertiary)] truncate max-w-[60%]">{{ asset.projectName }}</span>
              <span class="text-xs text-[var(--text-tertiary)]">{{ formatDate(asset.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Preview modal | 预览弹窗 -->
    <n-modal v-model:show="showPreview" preset="card" :title="previewAsset?.type === 'video' ? '视频预览' : '图片预览'" style="max-width: 720px">
      <div v-if="previewAsset" class="space-y-4">
        <div class="rounded-lg overflow-hidden bg-[var(--bg-tertiary)] flex items-center justify-center max-h-[60vh]">
          <img
            v-if="previewAsset.type === 'image'"
            :src="previewAsset.url"
            class="max-w-full max-h-[60vh] object-contain"
          />
          <video v-else :src="previewAsset.url" controls class="max-w-full max-h-[60vh]" />
        </div>
        <div v-if="previewAsset.prompt" class="text-sm text-[var(--text-secondary)]">
          <span class="font-medium text-[var(--text-primary)]">提示词：</span>{{ previewAsset.prompt }}
        </div>
        <div class="text-sm text-[var(--text-tertiary)] flex flex-wrap gap-x-4 gap-y-1">
          <span v-if="previewAsset.model">模型：{{ previewAsset.model }}</span>
          <span>项目：{{ previewAsset.projectName }}</span>
          <span>{{ formatDate(previewAsset.updatedAt) }}</span>
        </div>
        <div class="flex justify-end gap-2">
          <n-button @click="goToProject(previewAsset)">打开所在项目</n-button>
          <n-button type="primary" @click="downloadAsset(previewAsset)">下载</n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<script setup>
/**
 * Asset library view | 素材库视图
 * Aggregates all generated images/videos across projects
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon, NModal, NButton } from 'naive-ui'
import {
  ArrowBackOutline,
  SearchOutline,
  ImagesOutline,
  ImageOutline,
  VideocamOutline
} from '@vicons/ionicons5'
import AppHeader from '../components/AppHeader.vue'
import { projects } from '../stores/projects'

const router = useRouter()

// Filters | 筛选状态
const searchKeyword = ref('')
const typeFilter = ref('all')
const typeOptions = [
  { key: 'all', label: '全部' },
  { key: 'image', label: '图片' },
  { key: 'video', label: '视频' }
]

// Preview state | 预览状态
const previewAsset = ref(null)
const showPreview = computed({
  get: () => !!previewAsset.value,
  set: (val) => { if (!val) previewAsset.value = null }
})

/**
 * Collect all media assets from all projects | 从所有项目收集媒体素材
 */
const allAssets = computed(() => {
  const assets = []

  for (const project of projects.value) {
    const nodes = project.canvasData?.nodes || []

    for (const node of nodes) {
      if ((node.type === 'image' || node.type === 'video') && node.data?.url) {
        assets.push({
          key: `${project.id}_${node.id}`,
          type: node.type,
          url: node.data.url,
          prompt: node.data.prompt || '',
          model: node.data.model || '',
          projectId: project.id,
          projectName: project.name,
          nodeId: node.id,
          updatedAt: node.data.updatedAt || node.data.createdAt || project.updatedAt
        })
      }
    }
  }

  // Sort by updatedAt desc | 按更新时间倒序
  return assets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
})

/**
 * Filtered assets by type and keyword | 按类型和关键词筛选
 */
const filteredAssets = computed(() => {
  let list = allAssets.value

  if (typeFilter.value !== 'all') {
    list = list.filter((a) => a.type === typeFilter.value)
  }

  const keyword = searchKeyword.value.trim().toLowerCase()
  if (keyword) {
    list = list.filter(
      (a) =>
        a.prompt.toLowerCase().includes(keyword) ||
        a.projectName.toLowerCase().includes(keyword) ||
        a.model.toLowerCase().includes(keyword)
    )
  }

  return list
})

const formatDate = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const goHome = () => router.push('/')

const goToProject = (asset) => {
  router.push(`/canvas/${asset.projectId}`)
}

const downloadAsset = (asset) => {
  const a = document.createElement('a')
  a.href = asset.url
  a.download = `${asset.type}_${asset.nodeId}`
  a.target = '_blank'
  a.click()
}
</script>
