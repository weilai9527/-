/**
 * Tasks store | 任务中心状态管理
 * Tracks generation tasks (image/video) with localStorage persistence
 */
import { ref, computed } from 'vue'

const STORAGE_KEY = 'ai-canvas-tasks'
const MAX_TASKS = 200

const generateId = () => `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

// Task status: pending | running | polling | success | failed
export const tasks = ref([])

/**
 * Load tasks from localStorage | 从 localStorage 加载任务
 */
export const loadTasks = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      tasks.value = JSON.parse(stored)
    }
  } catch (err) {
    console.error('Failed to load tasks:', err)
    tasks.value = []
  }
}

const saveTasks = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks.value))
  } catch (err) {
    console.error('Failed to save tasks:', err)
  }
}

/**
 * Create a new task record | 创建任务记录
 * @param {Object} options - { type: 'image'|'video', prompt, model, projectId, projectName, nodeId }
 * @returns {string} Task ID
 */
export const createTask = ({ type, prompt = '', model = '', projectId = '', projectName = '', nodeId = '' }) => {
  const task = {
    id: generateId(),
    type,
    prompt,
    model,
    projectId,
    projectName,
    nodeId,
    status: 'running',
    resultUrl: '',
    error: '',
    createdAt: new Date().toISOString(),
    finishedAt: null
  }

  tasks.value = [task, ...tasks.value].slice(0, MAX_TASKS)
  saveTasks()
  return task.id
}

/**
 * Mark task as successful | 标记任务成功
 */
export const succeedTask = (id, resultUrl = '') => {
  const task = tasks.value.find((t) => t.id === id)
  if (!task) return
  task.status = 'success'
  task.resultUrl = resultUrl
  task.finishedAt = new Date().toISOString()
  saveTasks()
}

/**
 * Mark task as failed | 标记任务失败
 */
export const failTask = (id, error = '') => {
  const task = tasks.value.find((t) => t.id === id)
  if (!task) return
  task.status = 'failed'
  task.error = typeof error === 'string' ? error : error?.message || '未知错误'
  task.finishedAt = new Date().toISOString()
  saveTasks()
}

/**
 * Update task status (e.g. to polling) | 更新任务状态
 */
export const updateTaskStatus = (id, status) => {
  const task = tasks.value.find((t) => t.id === id)
  if (!task) return
  task.status = status
  saveTasks()
}

/**
 * Delete a task record | 删除任务记录
 */
export const deleteTask = (id) => {
  tasks.value = tasks.value.filter((t) => t.id !== id)
  saveTasks()
}

/**
 * Clear finished tasks (success + failed) | 清空已结束任务
 */
export const clearFinishedTasks = () => {
  tasks.value = tasks.value.filter((t) => t.status === 'running' || t.status === 'polling' || t.status === 'pending')
  saveTasks()
}

// Computed views | 计算视图
export const runningTasks = computed(() => tasks.value.filter((t) => t.status === 'running' || t.status === 'polling'))
export const failedTasks = computed(() => tasks.value.filter((t) => t.status === 'failed'))

// Auto-load on module import | 模块加载时自动读取
loadTasks()
