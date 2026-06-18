/**
 * Chat API | 对话 API
 */

import { request, getBaseUrl } from '@/utils'
import { getDefaultProvider, getProviderConfig } from '@/config/providers'

// 对话补全
export const chatCompletions = (data) =>
  request({
    url: `/chat/completions`,
    method: 'post',
    data
  })

// 流式对话补全
export const streamChatCompletions = async function* (data, signal, options = {}) {
  const currentProvider = localStorage.getItem('api-provider') || getDefaultProvider()
  const providerConfig = getProviderConfig(currentProvider)
  let apiKey = options.apiKey || ''

  if (!apiKey) {
    try {
      const apiKeysJson = localStorage.getItem('api-keys-by-provider')
      const apiKeys = apiKeysJson ? JSON.parse(apiKeysJson) : {}
      apiKey = apiKeys[currentProvider] || localStorage.getItem('apiKey') || ''
    } catch {
      apiKey = localStorage.getItem('apiKey') || ''
    }
  }

  // 优先使用传入的 baseUrl，否则使用默认的
  const baseUrl = options.baseUrl || (() => {
    try {
      const baseUrlsJson = localStorage.getItem('base-urls-by-provider')
      const baseUrls = baseUrlsJson ? JSON.parse(baseUrlsJson) : {}
      return baseUrls[currentProvider] || providerConfig.defaultBaseUrl || getBaseUrl()
    } catch {
      return providerConfig.defaultBaseUrl || getBaseUrl()
    }
  })()
  // 使用 options.endpoint 或默认的 /chat/completions
  const endpoint = options.endpoint || providerConfig.endpoints?.chat || '/chat/completions'

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ ...data, stream: true }),
    signal
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error?.error?.message || error?.message || 'Stream request failed')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data:')) continue

      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') return

      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content
        if (content) yield content
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
}
