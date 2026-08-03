import { createZip, readZip } from './backupZip'
import { createAssetId, getLocalAsset, saveLocalAsset } from './assetStorage'

const BACKUP_APP = 'huobao-canvas'
const FULL_BACKUP_VERSION = 2
const PROJECTS_FILE = 'projects.json'

const textDecoder = new TextDecoder()

const isDataUrl = (value) => typeof value === 'string' && value.startsWith('data:')
const isBlobUrl = (value) => typeof value === 'string' && value.startsWith('blob:')
const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value)
const isBackupUrl = (value) => isDataUrl(value) || isBlobUrl(value) || isHttpUrl(value)

const dataUrlToBlob = (dataUrl) => {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/)
  if (!match) throw new Error('无效的 data URL')

  const mimeType = match[1] || 'application/octet-stream'
  const isBase64 = !!match[2]
  const data = isBase64 ? atob(match[3]) : decodeURIComponent(match[3])
  const bytes = new Uint8Array(data.length)

  for (let i = 0; i < data.length; i++) {
    bytes[i] = data.charCodeAt(i)
  }

  return new Blob([bytes], { type: mimeType })
}

const sanitizeName = (value = 'asset') => {
  return String(value)
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'asset'
}

const extensionFromMime = (mimeType = '') => {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov'
  }
  return map[mimeType] || ''
}

const extensionFromUrl = (url = '') => {
  try {
    const pathname = new URL(url).pathname
    const match = pathname.match(/\.[a-z0-9]{2,5}$/i)
    return match ? match[0].toLowerCase() : ''
  } catch {
    const match = url.match(/\.[a-z0-9]{2,5}(?=$|[?#])/i)
    return match ? match[0].toLowerCase() : ''
  }
}

const cloneProjects = (projects) => JSON.parse(JSON.stringify(projects))

const getCloneProject = (projects, projectId) => projects.find(project => project.id === projectId)

const getCloneNode = (projects, projectId, nodeId) => {
  const project = getCloneProject(projects, projectId)
  return project?.canvasData?.nodes?.find(node => node.id === nodeId) || null
}

const localFieldFor = (field) => {
  if (field === 'url') {
    return {
      id: 'localAssetId',
      mimeType: 'localAssetMimeType',
      fileName: 'localAssetName'
    }
  }

  return {
    id: `${field}LocalAssetId`,
    mimeType: `${field}LocalAssetMimeType`,
    fileName: `${field}LocalAssetName`
  }
}

const setNodeAssetRef = (projects, ref, asset) => {
  const node = getCloneNode(projects, ref.projectId, ref.nodeId)
  if (!node?.data) return

  const fields = localFieldFor(ref.field)
  node.data[fields.id] = asset.id
  node.data[fields.mimeType] = asset.mimeType
  node.data[fields.fileName] = asset.fileName

  if (isDataUrl(node.data[ref.field]) || isBlobUrl(node.data[ref.field])) {
    node.data[ref.field] = ''
  }
}

const setProjectAssetRef = (projects, ref, asset) => {
  const project = getCloneProject(projects, ref.projectId)
  if (!project) return

  project.thumbnailLocalAssetId = asset.id
  project.thumbnailLocalAssetMimeType = asset.mimeType
  project.thumbnailLocalAssetName = asset.fileName

  if (isDataUrl(project.thumbnail) || isBlobUrl(project.thumbnail)) {
    project.thumbnail = ''
  }
}

const stripVolatileData = (projects) => {
  return projects.map(project => ({
    ...project,
    thumbnail: isDataUrl(project.thumbnail) || isBlobUrl(project.thumbnail) ? '' : project.thumbnail,
    canvasData: project.canvasData ? {
      ...project.canvasData,
      nodes: (project.canvasData.nodes || []).map(node => ({
        ...node,
        data: node.data ? stripNodeData(node.data) : node.data
      }))
    } : project.canvasData
  }))
}

const stripNodeData = (data) => {
  const cleaned = { ...data }

  delete cleaned.base64
  delete cleaned.maskData

  for (const field of ['url', 'thumbnail', 'refImage']) {
    if (isDataUrl(cleaned[field]) || isBlobUrl(cleaned[field])) {
      cleaned[field] = ''
    }
  }

  return cleaned
}

const getCandidateKey = (candidate) => {
  if (candidate.localAssetId) return `local:${candidate.localAssetId}`
  return `url:${candidate.value}`
}

const collectCandidates = (projects) => {
  const candidates = []

  for (const project of projects) {
    if (isBackupUrl(project.thumbnail) || project.thumbnailLocalAssetId) {
      candidates.push({
        value: project.thumbnail,
        kind: 'thumbnail',
        localAssetId: project.thumbnailLocalAssetId,
        fallbackName: `${project.name || project.id}-thumbnail`,
        ref: { type: 'projectThumbnail', projectId: project.id }
      })
    }

    for (const node of project.canvasData?.nodes || []) {
      const data = node.data || {}
      if (!['image', 'video'].includes(node.type)) continue

      for (const field of ['url', 'thumbnail', 'refImage']) {
        const localAssetId = field === 'url' ? data.localAssetId : data[`${field}LocalAssetId`]

        if (isBackupUrl(data[field]) || localAssetId) {
          candidates.push({
            value: data[field],
            kind: node.type,
            localAssetId,
            fallbackName: data.fileName || `${project.name || project.id}-${node.id}-${field}`,
            ref: { type: 'nodeData', projectId: project.id, nodeId: node.id, field }
          })
        }
      }

      if (!isBackupUrl(data.url) && isDataUrl(data.base64)) {
        candidates.push({
          value: data.base64,
          kind: 'image',
          localAssetId: data.localAssetId,
          fallbackName: data.fileName || `${project.name || project.id}-${node.id}`,
          ref: { type: 'nodeData', projectId: project.id, nodeId: node.id, field: 'url' }
        })
      }
    }
  }

  return candidates
}

const fetchCandidateBlob = async (candidate) => {
  if (candidate.localAssetId) {
    const localAsset = await getLocalAsset(candidate.localAssetId)
    if (localAsset?.blob) return localAsset.blob
  }

  if (isDataUrl(candidate.value)) return dataUrlToBlob(candidate.value)

  const response = await fetch(candidate.value)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.blob()
}

const assetMetaFromBlob = (candidate, blob) => {
  const id = createAssetId()
  const mimeType = blob.type || (candidate.kind === 'video' ? 'video/mp4' : 'image/png')
  const extension = extensionFromMime(mimeType) || extensionFromUrl(candidate.value) || (candidate.kind === 'video' ? '.mp4' : '.png')
  const fileName = `${sanitizeName(candidate.fallbackName)}${extension}`

  return {
    id,
    mimeType,
    fileName,
    path: `assets/${id}${extension}`,
    originalUrl: isHttpUrl(candidate.value) ? candidate.value : ''
  }
}

export const createFullBackupZip = async (projects) => {
  const backupProjects = cloneProjects(projects)
  const assetEntries = []
  const manifestAssets = []
  const processed = new Map()
  const failures = []

  for (const candidate of collectCandidates(projects)) {
    const key = getCandidateKey(candidate)
    let asset = processed.get(key)

    if (!asset) {
      try {
        const blob = await fetchCandidateBlob(candidate)
        asset = assetMetaFromBlob(candidate, blob)
        processed.set(key, asset)
        manifestAssets.push(asset)
        assetEntries.push({
          path: asset.path,
          blob
        })
      } catch (err) {
        failures.push({
          url: isHttpUrl(candidate.value) ? candidate.value : '',
          name: candidate.fallbackName,
          reason: err.message || '素材读取失败'
        })
        continue
      }
    }

    if (candidate.ref.type === 'projectThumbnail') {
      setProjectAssetRef(backupProjects, candidate.ref, asset)
    } else {
      setNodeAssetRef(backupProjects, candidate.ref, asset)
    }
  }

  const payload = {
    app: BACKUP_APP,
    version: FULL_BACKUP_VERSION,
    backupType: 'full',
    exportedAt: new Date().toISOString(),
    assets: manifestAssets,
    assetFailures: failures,
    projects: stripVolatileData(backupProjects)
  }

  const zip = await createZip([
    {
      path: PROJECTS_FILE,
      text: JSON.stringify(payload, null, 2)
    },
    ...assetEntries
  ])

  return {
    blob: zip,
    projectCount: projects.length,
    assetCount: manifestAssets.length,
    failedAssetCount: failures.length
  }
}

export const readBackupFile = async (file) => {
  const isZip = file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip'

  if (!isZip) {
    return {
      payload: JSON.parse(await file.text()),
      importedAssetCount: 0,
      missingAssetCount: 0
    }
  }

  const entries = await readZip(file)
  const projectsBytes = entries.get(PROJECTS_FILE)
  if (!projectsBytes) {
    throw new Error('备份 ZIP 缺少 projects.json')
  }

  const payload = JSON.parse(textDecoder.decode(projectsBytes))
  const assets = Array.isArray(payload.assets) ? payload.assets : []
  let importedAssetCount = 0
  let missingAssetCount = 0

  for (const asset of assets) {
    const bytes = entries.get(asset.path)
    if (!bytes) {
      missingAssetCount++
      continue
    }

    const blob = new Blob([bytes], { type: asset.mimeType || 'application/octet-stream' })
    await saveLocalAsset(blob, {
      id: asset.id,
      mimeType: asset.mimeType,
      fileName: asset.fileName,
      originalUrl: asset.originalUrl
    })
    importedAssetCount++
  }

  return {
    payload,
    importedAssetCount,
    missingAssetCount
  }
}
