<template>
  <!-- Home page | 首页 -->
  <div class="min-h-screen h-screen overflow-y-auto bg-[var(--bg-primary)]">
    <!-- Header | 顶部导航 -->
    <AppHeader>
      <template #right>
        <button
          class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors text-[var(--text-primary)]"
          title="素材库"
          @click="goToAssets"
        >
          <n-icon :size="20"><ImagesOutline /></n-icon>
        </button>
        <button
          class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors relative text-[var(--text-primary)]"
          title="任务中心"
          @click="goToTasks"
        >
          <n-icon :size="20"><ListOutline /></n-icon>
          <span
            v-if="runningCount > 0"
            class="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--accent-color)] text-white text-[10px] flex items-center justify-center"
          >{{ runningCount }}</span>
        </button>
        <button
          class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          :class="{ 'text-[var(--accent-color)]': isApiConfigured }"
          title="API 设置"
          @click="showApiSettings = true"
        >
          <n-icon :size="20"><SettingsOutline /></n-icon>
        </button>
      </template>
    </AppHeader>

    <!-- Main content | 主要内容 -->
    <main class="max-w-5xl mx-auto px-4 py-8 md:py-16">
      <!-- Welcome section | 欢迎区域 -->
      <section class="text-center mb-12">
        <div class="flex items-center justify-center gap-4 mb-8">
          <img src="../assets/logo.png" alt="Logo" class="w-12 h-12 md:w-16 md:h-16" />
          <h1 class="text-2xl md:text-4xl font-bold text-[var(--text-primary)]">欢迎来到火宝无限画布</h1>
        </div>
        
        <!-- Input area | 输入区域 -->
        <div class="max-w-2xl mx-auto">
          <div class="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-4 shadow-sm">
            <textarea
              v-model="inputText"
              placeholder="输入你的创意，开始新项目"
              class="w-full bg-transparent resize-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] min-h-[80px]"
              @keydown.enter.ctrl="handleCreateWithInput"
            />
            <div class="flex items-center justify-between mt-2">
              <div class="flex items-center gap-2">
                <!-- <button class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                  <n-icon :size="18"><AddOutline /></n-icon>
                </button>
                <button class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                  <n-icon :size="18"><ImageOutline /></n-icon>
                </button> -->
              </div>
              <div class="flex items-center gap-3">
                <button 
                  class="w-8 h-8 rounded-xl bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] flex items-center justify-center transition-colors"
                  @click="handleCreateWithInput"
                >
                  <n-icon :size="20" color="white"><SendOutline /></n-icon>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Quick suggestions | 快捷建议 -->
          <div class="flex flex-wrap items-center justify-center gap-2 mt-4">
            <span class="text-sm text-[var(--text-secondary)]">推荐：</span>
            <button 
              v-for="tag in suggestions" 
              :key="tag"
              class="px-3 py-1.5 text-sm rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-colors"
              @click="inputText = tag"
            >
              {{ tag }}
            </button>
            <button class="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
              <n-icon :size="16"><RefreshOutline /></n-icon>
            </button>
          </div>
        </div>
      </section>

      <!-- My projects section | 我的项目区域 -->
      <section ref="projectsSection">
        <div class="flex items-center justify-between gap-3 mb-4">
          <h2 class="text-lg font-semibold text-[var(--text-primary)]">我的项目</h2>
          <div class="flex items-center gap-2">
            <input
              ref="backupInputRef"
              type="file"
              accept="application/json,application/zip,.json,.zip"
              class="hidden"
              @change="handleImportBackup"
            />
            <button
              :disabled="isBackupBusy"
              class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-colors"
              title="导入项目备份"
              @click="triggerImportBackup"
            >
              <n-icon :size="16"><CloudUploadOutline /></n-icon>
              <span class="hidden sm:inline">导入</span>
            </button>
            <button
              :disabled="projects.length === 0 || isBackupBusy"
              class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="导出完整项目备份"
              @click="handleExportBackup"
            >
              <n-icon :size="16"><CloudDownloadOutline /></n-icon>
              <span class="hidden sm:inline">{{ isBackupBusy ? '处理中' : '备份' }}</span>
            </button>
            <button 
              class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white transition-colors"
              @click="createNewProject"
            >
              <n-icon :size="16"><AddOutline /></n-icon>
              新建项目
            </button>
          </div>
        </div>
        
        <!-- Empty state | 空状态 -->
        <div v-if="projects.length === 0" class="text-center py-12 bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-color)]">
          <n-icon :size="48" class="text-[var(--text-secondary)] mb-4"><FolderOutline /></n-icon>
          <p class="text-[var(--text-secondary)] mb-4">还没有项目，创建一个开始吧</p>
          <button 
            class="px-4 py-2 text-sm rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white transition-colors"
            @click="createNewProject"
          >
            创建第一个项目
          </button>
        </div>
        
        <!-- Projects grid | 项目网格 -->
        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            v-for="project in projects" 
            :key="project.id"
            class="group relative"
          >
            <!-- Project card | 项目卡片 -->
            <div 
              class="cursor-pointer"
              @click="openProject(project)"
            >
              <div 
                class="aspect-video rounded-xl overflow-hidden bg-[var(--bg-tertiary)] mb-2 border border-[var(--border-color)] relative"
                @mouseenter="handleThumbnailHover(project, true)"
                @mouseleave="handleThumbnailHover(project, false)"
              >
                <!-- Thumbnail or placeholder | 缩略图或占位 -->
                <template v-if="project.thumbnail">
                  <!-- Video thumbnail | 视频缩略图 -->
                  <video 
                    v-if="isVideoUrl(project.thumbnail)"
                    :ref="el => setVideoRef(project.id, el)"
                    :src="project.thumbnail"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    muted
                    loop
                    playsinline
                  />
                  <!-- Image thumbnail | 图片缩略图 -->
                  <img 
                    v-else
                    :src="project.thumbnail" 
                    :alt="project.name"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </template>
                <div v-else class="w-full h-full flex items-center justify-center">
                  <n-icon :size="32" class="text-[var(--text-secondary)]"><DocumentOutline /></n-icon>
                </div>
                
                <!-- Hover overlay | 悬浮遮罩 -->
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span class="text-white text-sm">打开项目</span>
                </div>
              </div>
              <p class="text-sm text-[var(--text-primary)] truncate">{{ project.name }}</p>
              <p class="text-xs text-[var(--text-secondary)]">{{ formatDate(project.updatedAt) }}</p>
            </div>
            
            <!-- Project actions | 项目操作 -->
            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <n-dropdown :options="getProjectActions(project)" placement="bottom-end" @select="(key) => handleProjectAction(key, project)">
                <button
                  class="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow hover:bg-white dark:hover:bg-gray-800 transition-colors"
                  @click.stop
                >
                  <n-icon :size="16"><EllipsisHorizontalOutline /></n-icon>
                </button>
              </n-dropdown>
            </div>
          </div>
        </div>
      </section>

      <!-- My templates section | 我的模板区域 -->
      <section class="mt-12">
        <div class="flex items-center justify-between gap-3 mb-4">
          <h2 class="text-lg font-semibold text-[var(--text-primary)]">我的模板</h2>
          <div class="flex items-center gap-2">
            <input
              ref="templateInputRef"
              type="file"
              accept="application/json,.json"
              class="hidden"
              @change="handleImportTemplate"
            />
            <button
              class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-colors"
              title="导入模板 JSON"
              @click="templateInputRef?.click()"
            >
              <n-icon :size="16"><CloudUploadOutline /></n-icon>
              <span class="hidden sm:inline">导入模板</span>
            </button>
          </div>
        </div>

        <!-- Empty state | 空状态 -->
        <div v-if="templates.length === 0" class="text-center py-10 bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-color)]">
          <n-icon :size="40" class="text-[var(--text-secondary)] mb-3"><GridOutline /></n-icon>
          <p class="text-[var(--text-secondary)] text-sm">还没有模板。在画布页通过项目菜单「保存为模板」创建。</p>
        </div>

        <!-- Templates grid | 模板网格 -->
        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            v-for="template in templates"
            :key="template.id"
            class="group relative bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] p-4 hover:border-[var(--accent-color)] transition-colors"
          >
            <div class="cursor-pointer" @click="createFromTemplate(template)">
              <div class="flex items-center gap-2 mb-2">
                <n-icon :size="18" class="text-[var(--accent-color)]"><GridOutline /></n-icon>
                <p class="text-sm font-medium text-[var(--text-primary)] truncate">{{ template.name }}</p>
              </div>
              <p class="text-xs text-[var(--text-secondary)] line-clamp-2 min-h-[2rem]">
                {{ template.description || `${template.canvasData.nodes.length} 个节点` }}
              </p>
              <p class="text-xs text-[var(--text-tertiary)] mt-1">{{ formatDate(template.createdAt) }}</p>
            </div>

            <!-- Template actions | 模板操作 -->
            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <n-dropdown :options="templateActionOptions" placement="bottom-end" @select="(key) => handleTemplateAction(key, template)">
                <button
                  class="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow hover:bg-white dark:hover:bg-gray-800 transition-colors"
                  @click.stop
                >
                  <n-icon :size="16"><EllipsisHorizontalOutline /></n-icon>
                </button>
              </n-dropdown>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Left sidebar | 左侧边栏 -->
    <aside class="fixed left-4 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-2 p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-sm">
      <button 
        class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
        title="新建项目"
        @click="createNewProject"
      >
        <n-icon :size="20"><DocumentOutline /></n-icon>
      </button>
      <button 
        class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
        title="我的项目"
        @click="scrollToProjects"
      >
        <n-icon :size="20"><FolderOutline /></n-icon>
      </button>
    </aside>

    <!-- API Settings Modal | API 设置弹窗 -->
    <ApiSettings v-model:show="showApiSettings" @saved="refreshApiConfig" />

    <!-- Rename modal | 重命名弹窗 -->
    <n-modal v-model:show="showRenameModal" preset="dialog" title="重命名项目">
      <n-input v-model:value="renameValue" placeholder="请输入项目名称" />
      <template #action>
        <n-button @click="showRenameModal = false">取消</n-button>
        <n-button type="primary" @click="confirmRename">确定</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
/**
 * Home view component | 首页视图组件
 * Entry point with project list and creation input
 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon, NDropdown, NModal, NInput, NButton, useDialog } from 'naive-ui'
import {
  AddOutline,
  ImageOutline,
  ImagesOutline,
  ListOutline,
  GridOutline,
  SendOutline,
  RefreshOutline,
  DocumentOutline,
  FolderOutline,
  EllipsisHorizontalOutline,
  CreateOutline,
  CopyOutline,
  CloudDownloadOutline,
  CloudUploadOutline,
  SettingsOutline,
  TrashOutline
} from '@vicons/ionicons5'
import {
  projects,
  initProjectsStore,
  createProject,
  updateProject,
  deleteProject,
  duplicateProject,
  importProjectsBackup,
  renameProject
} from '../stores/projects'
import {
  templates,
  getTemplateCanvas,
  exportTemplate,
  importTemplate,
  deleteTemplate
} from '../stores/templates'
import { hydrateProjectsWithLocalAssets } from '../utils/assetStorage'
import { createFullBackupZip, readBackupFile } from '../utils/fullBackup'
import { useModelStore } from '../stores/pinia'
import { runningTasks } from '../stores/tasks'
import ApiSettings from '../components/ApiSettings.vue'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
const dialog = useDialog()
const modelStore = useModelStore()

// Task center badge | 任务中心角标
const runningCount = computed(() => runningTasks.value.length)

const goToAssets = () => router.push('/assets')
const goToTasks = () => router.push('/tasks')

// API Settings state | API 设置状态
const showApiSettings = ref(false)
const isApiConfigured = computed(() => !!modelStore.currentApiKey)

// Refresh API config state | 刷新 API 配置状态
const refreshApiConfig = () => {
  // 通过 computed 自动更新，不需要手动刷新
}

// Video refs for hover play | 视频引用用于悬停播放
const videoRefs = new Map()

// Set video ref | 设置视频引用
const setVideoRef = (projectId, el) => {
  if (el) {
    videoRefs.set(projectId, el)
  } else {
    videoRefs.delete(projectId)
  }
}

// Handle thumbnail hover | 处理缩略图悬停
const handleThumbnailHover = (project, isHovering) => {
  if (!isVideoUrl(project.thumbnail)) return
  
  const video = videoRefs.get(project.id)
  if (!video) return
  
  if (isHovering) {
    video.play().catch(() => {
      // Ignore play errors (e.g., autoplay policy)
    })
  } else {
    video.pause()
    video.currentTime = 0 // Reset to start
  }
}

// Input state | 输入状态
const inputText = ref('')

// Rename modal state | 重命名弹窗状态
const showRenameModal = ref(false)
const renameValue = ref('')
const renameTargetId = ref(null)
const backupInputRef = ref(null)
const isBackupBusy = ref(false)

// Suggestions tags | 建议标签
const suggestions = [
  '雨中魔法森林',
  '日式街面美食摄影',
  '瀑布水流飞溅',
  '雨天富声旁边花语'
]

// Format date | 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now - d
  
  // Less than 1 minute | 小于1分钟
  if (diff < 60000) return '刚刚'
  // Less than 1 hour | 小于1小时
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  // Less than 1 day | 小于1天
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  // Less than 7 days | 小于7天
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  // Format as date | 格式化为日期
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// Get project actions | 获取项目操作选项
const getProjectActions = (project) => [
  { label: '重命名', key: 'rename', icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) },
  { label: '复制', key: 'duplicate', icon: () => h(NIcon, null, { default: () => h(CopyOutline) }) },
  { type: 'divider' },
  { label: '删除', key: 'delete', icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) }
]

// ========== Templates | 模板 ==========
const templateInputRef = ref(null)

const templateActionOptions = [
  { label: '导出 JSON', key: 'export', icon: () => h(NIcon, null, { default: () => h(CloudDownloadOutline) }) },
  { type: 'divider' },
  { label: '删除', key: 'delete', icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) }
]

// Create project from template | 从模板创建项目
const createFromTemplate = (template) => {
  const canvas = getTemplateCanvas(template.id)
  if (!canvas) {
    window.$message?.error('模板数据异常')
    return
  }
  const id = createProject(`${template.name} 项目`)
  updateProject(id, { canvasData: canvas })
  window.$message?.success(`已基于模板「${template.name}」创建项目`)
  router.push(`/canvas/${id}`)
}

// Handle template dropdown actions | 处理模板下拉操作
const handleTemplateAction = (key, template) => {
  if (key === 'export') {
    const json = exportTemplate(template.id)
    if (!json) return
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `template-${template.name}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } else if (key === 'delete') {
    dialog.warning({
      title: '删除模板',
      content: `确定要删除模板「${template.name}」吗？`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: () => {
        deleteTemplate(template.id)
        window.$message?.success('模板已删除')
      }
    })
  }
}

// Import template from JSON file | 从 JSON 文件导入模板
const handleImportTemplate = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  try {
    const text = await file.text()
    importTemplate(text)
    window.$message?.success('模板导入成功')
  } catch (err) {
    window.$message?.error(err.message || '模板导入失败')
  }
}

// Trigger backup file picker | 触发备份文件选择
const triggerImportBackup = () => {
  backupInputRef.value?.click()
}

// Export all projects to a local JSON backup | 导出所有项目到本地 JSON 备份
const handleExportBackup = async () => {
  if (projects.value.length === 0) {
    window.$message?.warning('暂无项目可备份')
    return
  }

  isBackupBusy.value = true
  try {
    const backup = await createFullBackupZip(projects.value)
    const url = URL.createObjectURL(backup.blob)
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')

    link.href = url
    link.download = `huobao-canvas-full-backup-${timestamp}.zip`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)

    if (backup.failedAssetCount > 0) {
      window.$message?.warning(`已备份 ${backup.projectCount} 个项目和 ${backup.assetCount} 个素材，${backup.failedAssetCount} 个素材保留原链接`)
    } else {
      window.$message?.success(`已完整备份 ${backup.projectCount} 个项目和 ${backup.assetCount} 个素材`)
    }
  } catch (err) {
    window.$message?.error(err.message || '备份失败')
  } finally {
    isBackupBusy.value = false
  }
}

// Import projects from a local JSON backup | 从本地 JSON 备份导入项目
const handleImportBackup = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  isBackupBusy.value = true
  try {
    const { payload, importedAssetCount, missingAssetCount } = await readBackupFile(file)
    const result = importProjectsBackup(payload)
    projects.value = await hydrateProjectsWithLocalAssets(projects.value)

    if (missingAssetCount > 0) {
      window.$message?.warning(`已导入 ${result.imported} 个项目和 ${importedAssetCount} 个素材，${missingAssetCount} 个素材缺失`)
    } else if (importedAssetCount > 0) {
      window.$message?.success(`已导入 ${result.imported} 个项目和 ${importedAssetCount} 个素材`)
    } else {
      window.$message?.success(`已导入 ${result.imported} 个项目`)
    }
  } catch (err) {
    window.$message?.error(err.message || '导入失败，请确认备份文件是否正确')
  } finally {
    isBackupBusy.value = false
    event.target.value = ''
  }
}

// Handle project action | 处理项目操作
const handleProjectAction = (key, project) => {
  switch (key) {
    case 'rename':
      renameTargetId.value = project.id
      renameValue.value = project.name
      showRenameModal.value = true
      break
    case 'duplicate': {
      const newId = duplicateProject(project.id)
      if (newId) {
        window.$message?.success('项目已复制')
      }
      break
    }
    case 'delete':
      dialog.warning({
        title: '删除项目',
        content: `确定要删除项目「${project.name}」吗？此操作不可恢复。`,
        positiveText: '删除',
        negativeText: '取消',
        onPositiveClick: () => {
          deleteProject(project.id)
          window.$message?.success('项目已删除')
        }
      })
      break
  }
}

// Confirm rename | 确认重命名
const confirmRename = () => {
  if (renameTargetId.value && renameValue.value.trim()) {
    renameProject(renameTargetId.value, renameValue.value.trim())
    window.$message?.success('已重命名')
  }
  showRenameModal.value = false
  renameTargetId.value = null
  renameValue.value = ''
}

// Check API key before navigation | 跳转前检查 API Key
const checkApiKeyAndNavigate = (callback) => {
  
  if (!isApiConfigured.value) {
    dialog.warning({
      title: '未配置 API Key',
      content: '请先在设置中配置 API Key 才能使用画布功能。',
      positiveText: '知道了'
    })
    return false
  }
  callback()
  return true
}

// Create new project | 创建新项目
const createNewProject = () => {
  checkApiKeyAndNavigate(() => {
    const id = createProject('未命名项目')
    router.push(`/canvas/${id}`)
  })
}

// Create project with input text | 使用输入文本创建项目
const handleCreateWithInput = () => {
  checkApiKeyAndNavigate(() => {
    const name = inputText.value.trim() || '未命名项目'
    const id = createProject(name)
    // Store the input text to be used as initial prompt
    sessionStorage.setItem('ai-canvas-initial-prompt', inputText.value.trim())
    inputText.value = ''
    router.push(`/canvas/${id}`)
  })
}

// Open existing project | 打开已有项目
const openProject = (project) => {
  checkApiKeyAndNavigate(() => {
    router.push(`/canvas/${project.id}`)
  })
}

// Check if URL is a video | 检查 URL 是否为视频
const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']
  return videoExtensions.some(ext => url.toLowerCase().includes(ext))
}

// Import h for render functions | 导入 h 用于渲染函数
import { h } from 'vue'

// Projects section ref | 项目区域引用
const projectsSection = ref(null)

// Scroll to projects section | 滚动到项目区域
const scrollToProjects = () => {
  if (projectsSection.value) {
    projectsSection.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Initialize projects store on mount | 挂载时初始化项目存储
onMounted(() => {
  initProjectsStore()
})
</script>
