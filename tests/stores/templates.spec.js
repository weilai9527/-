import { describe, it, expect, beforeEach } from 'vitest'

beforeEach(() => {
  localStorage.clear()
})

const getStore = async () => {
  const mod = await import('@/stores/templates')
  return mod
}

describe('templates store', () => {
  it('saves a template from canvas data', async () => {
    const store = await getStore()
    store.templates.value = []

    const id = store.saveAsTemplate({
      name: '分镜模板',
      description: '三镜头分镜',
      canvasData: {
        nodes: [
          { id: 'n1', type: 'text', position: { x: 0, y: 0 }, data: { content: 'hello', label: '文本' } },
          { id: 'n2', type: 'imageConfig', position: { x: 300, y: 0 }, data: { model: 'm1', size: '1024x1024' } }
        ],
        edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
        viewport: { x: 0, y: 0, zoom: 1 }
      }
    })

    const template = store.templates.value.find((t) => t.id === id)
    expect(template.name).toBe('分镜模板')
    expect(template.canvasData.nodes.length).toBe(2)
    expect(template.canvasData.edges.length).toBe(1)
  })

  it('strips generated results and transient state from nodes', async () => {
    const store = await getStore()
    store.templates.value = []

    const id = store.saveAsTemplate({
      name: '清理测试',
      canvasData: {
        nodes: [
          {
            id: 'n1',
            type: 'image',
            position: { x: 0, y: 0 },
            data: {
              url: 'http://example.com/gen.png',
              base64: 'data:image/png;base64,xx',
              loading: false,
              error: '',
              executed: true,
              taskId: 'task_123',
              prompt: '保留我',
              model: 'doubao'
            }
          }
        ],
        edges: [],
        viewport: {}
      }
    })

    const node = store.templates.value.find((t) => t.id === id).canvasData.nodes[0]
    expect(node.data.url).toBeUndefined()
    expect(node.data.base64).toBeUndefined()
    expect(node.data.loading).toBeUndefined()
    expect(node.data.executed).toBeUndefined()
    expect(node.data.taskId).toBeUndefined()
    // Config fields are kept | 配置字段保留
    expect(node.data.prompt).toBe('保留我')
    expect(node.data.model).toBe('doubao')
  })

  it('persists templates to localStorage', async () => {
    const store = await getStore()
    store.templates.value = []

    store.saveAsTemplate({ name: '持久化', canvasData: { nodes: [], edges: [] } })
    const raw = JSON.parse(localStorage.getItem('ai-canvas-templates'))
    expect(raw[0].name).toBe('持久化')
  })

  it('returns deep copy from getTemplateCanvas', async () => {
    const store = await getStore()
    store.templates.value = []

    const id = store.saveAsTemplate({
      name: '深拷贝',
      canvasData: { nodes: [{ id: 'n1', type: 'text', data: { content: 'x' } }], edges: [] }
    })

    const canvas = store.getTemplateCanvas(id)
    canvas.nodes[0].data.content = '修改后'

    const template = store.templates.value.find((t) => t.id === id)
    expect(template.canvasData.nodes[0].data.content).toBe('x')
  })

  it('exports and imports template round-trip', async () => {
    const store = await getStore()
    store.templates.value = []

    const id = store.saveAsTemplate({
      name: '往返测试',
      description: 'desc',
      canvasData: { nodes: [{ id: 'n1', type: 'text', data: {} }], edges: [] }
    })

    const json = store.exportTemplate(id)
    expect(json).toBeTruthy()

    store.templates.value = []
    const newId = store.importTemplate(json)
    const imported = store.templates.value.find((t) => t.id === newId)
    expect(imported.name).toBe('往返测试')
    expect(imported.canvasData.nodes.length).toBe(1)
  })

  it('throws on invalid template payload', async () => {
    const store = await getStore()
    expect(() => store.importTemplate({ foo: 'bar' })).toThrow('模板文件格式不正确')
  })

  it('deletes a template', async () => {
    const store = await getStore()
    store.templates.value = []

    const id = store.saveAsTemplate({ name: '待删除', canvasData: { nodes: [], edges: [] } })
    expect(store.templates.value.length).toBe(1)

    store.deleteTemplate(id)
    expect(store.templates.value.length).toBe(0)
  })
})
