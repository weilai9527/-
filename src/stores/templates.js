/**
 * Templates store | 模板状态管理
 * Saves canvas layouts as reusable templates with localStorage persistence
 */
import { ref } from 'vue'

const STORAGE_KEY = 'ai-canvas-templates'
const MAX_TEMPLATES = 50

const generateId = () => `template_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

// Template list | 模板列表
export const templates = ref([])

/**
 * Load templates from localStorage | 从 localStorage 加载模板
 */
export const loadTemplates = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      templates.value = JSON.parse(stored)
    }
  } catch (err) {
    console.error('Failed to load templates:', err)
    templates.value = []
  }
}

const saveTemplates = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates.value))
  } catch (err) {
    console.error('Failed to save templates:', err)
    window.$message?.error('模板保存失败，存储空间可能不足')
  }
}

/**
 * Clean node data for template storage | 清理节点数据用于模板存储
 * Strips generated results, keeps structure and config
 */
const cleanNodeForTemplate = (node) => {
  if (!node.data) return node

  const data = { ...node.data }

  // Remove generated results and transient state | 移除生成结果和临时状态
  const transientFields = [
    'url', 'base64', 'thumbnail', 'refImage', 'maskData',
    'loading', 'error', 'progress', 'attempt',
    'executed', 'outputNodeId', 'autoExecute',
    'taskId', 'taskRecordId',
    'localAssetId', 'localAssetMimeType', 'thumbnailLocalAssetId', 'refImageLocalAssetId',
    'updatedAt', 'createdAt'
  ]
  for (const field of transientFields) {
    delete data[field]
  }

  return { ...node, data }
}

/**
 * Save current canvas as a template | 将当前画布保存为模板
 * @param {Object} options - { name, description, canvasData }
 * @returns {string} Template ID
 */
export const saveAsTemplate = ({ name, description = '', canvasData }) => {
  const id = generateId()

  const template = {
    id,
    name: name?.trim() || '未命名模板',
    description: description?.trim() || '',
    createdAt: new Date().toISOString(),
    canvasData: {
      nodes: (canvasData?.nodes || []).map(cleanNodeForTemplate),
      edges: JSON.parse(JSON.stringify(canvasData?.edges || [])),
      viewport: canvasData?.viewport || { x: 100, y: 50, zoom: 0.8 }
    }
  }

  templates.value = [template, ...templates.value].slice(0, MAX_TEMPLATES)
  saveTemplates()
  return id
}

/**
 * Delete a template | 删除模板
 */
export const deleteTemplate = (id) => {
  templates.value = templates.value.filter((t) => t.id !== id)
  saveTemplates()
}

/**
 * Get template canvas data for creating a new project | 获取模板画布数据（深拷贝）
 */
export const getTemplateCanvas = (id) => {
  const template = templates.value.find((t) => t.id === id)
  if (!template) return null
  return JSON.parse(JSON.stringify(template.canvasData))
}

/**
 * Export template as JSON string | 导出模板为 JSON 字符串
 */
export const exportTemplate = (id) => {
  const template = templates.value.find((t) => t.id === id)
  if (!template) return null
  return JSON.stringify(
    {
      app: 'huobao-canvas',
      kind: 'template',
      version: 1,
      exportedAt: new Date().toISOString(),
      template
    },
    null,
    2
  )
}

/**
 * Import template from JSON payload | 从 JSON 数据导入模板
 * @param {Object|string} payload - Parsed JSON object or JSON string
 * @returns {string} New template ID
 */
export const importTemplate = (payload) => {
  const data = typeof payload === 'string' ? JSON.parse(payload) : payload
  const template = data?.template || data

  if (!template?.canvasData?.nodes || !Array.isArray(template.canvasData.nodes)) {
    throw new Error('模板文件格式不正确')
  }

  const id = generateId()
  const imported = {
    id,
    name: `${(template.name || '导入模板').trim()}`,
    description: template.description || '',
    createdAt: new Date().toISOString(),
    canvasData: {
      nodes: template.canvasData.nodes,
      edges: Array.isArray(template.canvasData.edges) ? template.canvasData.edges : [],
      viewport: template.canvasData.viewport || { x: 100, y: 50, zoom: 0.8 }
    }
  }

  templates.value = [imported, ...templates.value].slice(0, MAX_TEMPLATES)
  saveTemplates()
  return id
}

// Auto-load on module import | 模块加载时自动读取
loadTemplates()
