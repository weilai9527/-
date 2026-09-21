import { describe, it, expect } from 'vitest'
import { getNestedValue, parseApiResult } from '@/utils/schema'

describe('getNestedValue', () => {
  it('returns value at simple path', () => {
    expect(getNestedValue({ a: 1 }, 'a')).toBe(1)
  })

  it('returns value at nested path', () => {
    const obj = { data: { choices: [{ message: { content: 'hi' } }] } }
    expect(getNestedValue(obj, 'data.choices.0.message.content')).toBe('hi')
  })

  it('returns undefined for missing path', () => {
    expect(getNestedValue({ a: 1 }, 'b.c')).toBeUndefined()
  })

  it('returns obj itself when path is empty', () => {
    const obj = { a: 1 }
    expect(getNestedValue(obj, '')).toBe(obj)
  })

  it('handles null/undefined gracefully', () => {
    expect(getNestedValue(null, 'a.b')).toBeNull()
    expect(getNestedValue(undefined, 'a.b')).toBeUndefined()
  })
})

describe('parseApiResult', () => {
  it('returns empty array for null result', () => {
    expect(parseApiResult(null)).toEqual([])
  })

  it('parses image result with default data field', () => {
    const result = { data: [{ url: 'a.png' }, { url: 'b.png' }] }
    expect(parseApiResult(result, null, 'image')).toEqual([{ url: 'a.png' }, { url: 'b.png' }])
  })

  it('parses video result with default video_url field', () => {
    const result = { video_url: 'v.mp4' }
    expect(parseApiResult(result, null, 'video')).toEqual(['v.mp4'])
  })

  it('parses array path with displayField containing []', () => {
    const result = { data: [{ url: 'a.png' }, { url: 'b.png' }] }
    const schema = { displayField: 'data[].url' }
    expect(parseApiResult(result, schema, 'image')).toEqual(['a.png', 'b.png'])
  })

  it('parses nested array path like choices[].message.content', () => {
    const result = { choices: [{ message: { content: 'hello' } }, { message: { content: 'world' } }] }
    const schema = { displayField: 'choices[].message.content' }
    expect(parseApiResult(result, schema, 'chat')).toEqual(['hello', 'world'])
  })

  it('parses simple displayField path', () => {
    const result = { output: { images: ['x.png'] } }
    const schema = { displayField: 'output.images' }
    expect(parseApiResult(result, schema, 'image')).toEqual(['x.png'])
  })

  it('wraps single object in array', () => {
    const result = { data: { url: 'single.png' } }
    expect(parseApiResult(result, null, 'image')).toEqual([{ url: 'single.png' }])
  })

  it('filters out falsy values in array extraction', () => {
    const result = { data: [{ url: 'a.png' }, { url: '' }, { noUrl: true }] }
    const schema = { displayField: 'data[].url' }
    expect(parseApiResult(result, schema, 'image')).toEqual(['a.png'])
  })

  it('falls back to result.data when no displayField and no default match', () => {
    const result = { data: [1, 2, 3] }
    expect(parseApiResult(result, null, 'chat')).toEqual([1, 2, 3])
  })
})
