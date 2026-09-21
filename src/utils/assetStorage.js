const DB_NAME = 'huobao-canvas-assets'
const DB_VERSION = 1
const STORE_NAME = 'assets'

const objectUrlCache = new Map()
const dataUrlCache = new Map()

const isBrowser = () => typeof window !== 'undefined' && typeof indexedDB !== 'undefined'

export const createAssetId = () => `asset_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

const openDb = () => {
  if (!isBrowser()) {
    return Promise.reject(new Error('当前环境不支持本地素材存储'))
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const withStore = async (mode, callback) => {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    let result

    transaction.oncomplete = () => {
      db.close()
      resolve(result)
    }
    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }

    result = callback(store)
  })
}

export const saveLocalAsset = async (blob, metadata = {}) => {
  const id = metadata.id || createAssetId()
  const record = {
    id,
    blob,
    mimeType: metadata.mimeType || blob.type || 'application/octet-stream',
    fileName: metadata.fileName || `${id}`,
    originalUrl: metadata.originalUrl || '',
    createdAt: metadata.createdAt || new Date().toISOString(),
    // Extended metadata for asset library | 素材库扩展元数据
    type: metadata.type || (blob.type?.startsWith('video/') ? 'video' : 'image'),
    prompt: metadata.prompt || '',
    model: metadata.model || '',
    projectId: metadata.projectId || '',
    projectName: metadata.projectName || ''
  }

  await withStore('readwrite', (store) => store.put(record))

  if (objectUrlCache.has(id)) {
    URL.revokeObjectURL(objectUrlCache.get(id))
    objectUrlCache.delete(id)
  }
  dataUrlCache.delete(id)

  return record
}

export const getLocalAsset = async (id) => {
  if (!id) return null

  return withStore('readonly', (store) => {
    const request = store.get(id)
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  })
}

/**
 * List all local assets (metadata only, blobs excluded for performance) | 列出所有本地素材（仅元数据）
 * @returns {Promise<Array>} Asset metadata records sorted by createdAt desc
 */
export const listLocalAssets = async () => {
  if (!isBrowser()) return []

  const records = await withStore('readonly', (store) => {
    const request = store.getAll()
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  })

  return records
    .map(({ blob, ...meta }) => meta)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

/**
 * Delete a local asset | 删除本地素材
 */
export const deleteLocalAsset = async (id) => {
  if (!id) return

  await withStore('readwrite', (store) => store.delete(id))

  if (objectUrlCache.has(id)) {
    URL.revokeObjectURL(objectUrlCache.get(id))
    objectUrlCache.delete(id)
  }
  dataUrlCache.delete(id)
}

export const getLocalAssetObjectUrl = async (id) => {
  if (!id) return ''
  if (objectUrlCache.has(id)) return objectUrlCache.get(id)

  const record = await getLocalAsset(id)
  if (!record?.blob) return ''

  const url = URL.createObjectURL(record.blob)
  objectUrlCache.set(id, url)
  return url
}

export const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(blob)
})

export const getLocalAssetDataUrl = async (id) => {
  if (!id) return ''
  if (dataUrlCache.has(id)) return dataUrlCache.get(id)

  const record = await getLocalAsset(id)
  if (!record?.blob) return ''

  const dataUrl = await blobToDataUrl(record.blob)
  dataUrlCache.set(id, dataUrl)
  return dataUrl
}

const hydrateNodeData = async (node) => {
  if (!node?.data) return node

  const data = { ...node.data }

  if (data.localAssetId) {
    const url = await getLocalAssetObjectUrl(data.localAssetId)
    if (url) data.url = url

    const mimeType = data.localAssetMimeType || ''
    if (mimeType.startsWith('image/')) {
      const dataUrl = await getLocalAssetDataUrl(data.localAssetId)
      if (dataUrl) data.base64 = dataUrl
    }
  }

  if (data.thumbnailLocalAssetId) {
    const thumbnail = await getLocalAssetObjectUrl(data.thumbnailLocalAssetId)
    if (thumbnail) data.thumbnail = thumbnail
  }

  if (data.refImageLocalAssetId) {
    const refImage = await getLocalAssetObjectUrl(data.refImageLocalAssetId)
    if (refImage) data.refImage = refImage
  }

  return { ...node, data }
}

export const hydrateNodesWithLocalAssets = async (nodes = []) => {
  return Promise.all(nodes.map(hydrateNodeData))
}

export const hydrateProjectsWithLocalAssets = async (projectList = []) => {
  return Promise.all(projectList.map(async (project) => {
    const hydratedProject = { ...project }

    if (hydratedProject.thumbnailLocalAssetId) {
      const thumbnail = await getLocalAssetObjectUrl(hydratedProject.thumbnailLocalAssetId)
      if (thumbnail) hydratedProject.thumbnail = thumbnail
    }

    if (hydratedProject.canvasData?.nodes) {
      hydratedProject.canvasData = {
        ...hydratedProject.canvasData,
        nodes: await hydrateNodesWithLocalAssets(hydratedProject.canvasData.nodes)
      }
    }

    return hydratedProject
  }))
}
