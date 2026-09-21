import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock assetStorage before importing the store
vi.mock('@/utils/assetStorage', () => ({
  hydrateProjectsWithLocalAssets: vi.fn(async (projects) => projects)
}))

// jsdom provides localStorage; make sure it's clean
beforeEach(() => {
  localStorage.clear()
})

// Dynamic import so the mock is applied first
const getStore = async () => {
  const mod = await import('@/stores/projects')
  return mod
}

describe('projects store', () => {
  it('creates a project with default values', async () => {
    const store = await getStore()
    store.projects.value = []

    const id = store.createProject('测试项目')
    expect(id).toMatch(/^project_/)

    const project = store.projects.value.find((p) => p.id === id)
    expect(project).toBeTruthy()
    expect(project.name).toBe('测试项目')
    expect(project.canvasData.nodes).toEqual([])
    expect(project.canvasData.edges).toEqual([])
    expect(project.canvasData.viewport).toEqual({ x: 100, y: 50, zoom: 0.8 })
  })

  it('persists projects to localStorage on create', async () => {
    const store = await getStore()
    store.projects.value = []

    store.createProject('持久化测试')
    const raw = localStorage.getItem('ai-canvas-projects')
    expect(raw).toBeTruthy()

    const parsed = JSON.parse(raw)
    expect(parsed[0].name).toBe('持久化测试')
  })

  it('updates project and moves it to top', async () => {
    const store = await getStore()
    store.projects.value = []

    const id1 = store.createProject('项目A')
    const id2 = store.createProject('项目B')

    expect(store.projects.value[0].id).toBe(id2)

    store.updateProject(id1, { name: '项目A-改' })
    expect(store.projects.value[0].id).toBe(id1)
    expect(store.projects.value[0].name).toBe('项目A-改')
  })

  it('deletes a project', async () => {
    const store = await getStore()
    store.projects.value = []

    const id = store.createProject('待删除')
    expect(store.projects.value.length).toBe(1)

    store.deleteProject(id)
    expect(store.projects.value.length).toBe(0)
  })

  it('duplicates a project with new id and 副本 suffix', async () => {
    const store = await getStore()
    store.projects.value = []

    const id = store.createProject('原始')
    const newId = store.duplicateProject(id)

    expect(newId).not.toBe(id)
    const copy = store.projects.value.find((p) => p.id === newId)
    expect(copy.name).toBe('原始 (副本)')
  })

  it('cleans base64 and blob data before saving', async () => {
    const store = await getStore()
    store.projects.value = []

    const id = store.createProject('清理测试')
    store.updateProjectCanvas(id, {
      nodes: [
        {
          id: 'n1',
          type: 'image',
          data: {
            url: 'data:image/png;base64,xxxx',
            base64: 'data:image/png;base64,xxxx',
            thumbnail: 'blob:http://localhost/abc'
          }
        }
      ]
    })

    const raw = JSON.parse(localStorage.getItem('ai-canvas-projects'))
    const node = raw[0].canvasData.nodes[0]
    expect(node.data.base64).toBeUndefined()
    expect(node.data.url).toBeUndefined()
    expect(node.data.thumbnail).toBeUndefined()
  })

  it('imports backup and renames conflicting ids', async () => {
    const store = await getStore()
    store.projects.value = []

    const id = store.createProject('已存在')
    const backup = {
      projects: [
        {
          id, // conflicting id
          name: '已存在',
          canvasData: { nodes: [], edges: [], viewport: {} }
        }
      ]
    }

    const result = store.importProjectsBackup(backup)
    expect(result.imported).toBe(1)

    const imported = store.projects.value[0]
    expect(imported.id).not.toBe(id)
    expect(imported.name).toBe('已存在 (导入)')
  })

  it('throws on invalid backup payload', async () => {
    const store = await getStore()
    expect(() => store.importProjectsBackup({ foo: 'bar' })).toThrow('备份文件格式不正确')
  })

  it('updates thumbnail from latest media node on canvas update', async () => {
    const store = await getStore()
    store.projects.value = []

    const id = store.createProject('缩略图测试')
    store.updateProjectCanvas(id, {
      nodes: [
        {
          id: 'n1',
          type: 'image',
          data: { url: 'http://example.com/old.png', updatedAt: 1000 }
        },
        {
          id: 'n2',
          type: 'image',
          data: { url: 'http://example.com/new.png', updatedAt: 2000 }
        }
      ]
    })

    const project = store.projects.value.find((p) => p.id === id)
    expect(project.thumbnail).toBe('http://example.com/new.png')
  })
})
