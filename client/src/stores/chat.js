import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

function uid(prefix = 'm') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** 同源 /api（开发由 Vite 转发，生产/Nginx 同理） */
function apiUrl(path) {
  const base = import.meta.env.VITE_API_BASE || ''
  return `${base}${path}`
}

/**
 * 聊天 Store（Pinia Setup Store）
 * 状态机：idle -> streaming -> idle
 * 事件：text_delta / tool_start / tool_end / error / done
 */
export const useChatStore = defineStore('chat', () => {
  const messages = ref([])
  const input = ref('')
  const status = ref('idle') // idle | streaming | error
  const mode = ref('unknown')
  const errorMessage = ref('')
  let abortController = null

  const isStreaming = computed(() => status.value === 'streaming')

  async function refreshHealth() {
    try {
      const res = await fetch(apiUrl('/api/health'))
      const data = await res.json()
      mode.value = data.mode || 'unknown'
    } catch (_) {
      mode.value = 'offline'
    }
  }

  function appendUser(content) {
    messages.value.push({
      id: uid('user'),
      role: 'user',
      parts: [{ type: 'text', text: content }]
    })
  }

  function settleStaleAssistants() {
    for (const m of messages.value) {
      if (m.role === 'assistant' && m.status === 'streaming') {
        m.status = 'error'
        if (!m.parts.length) {
          m.parts.push({ type: 'error', text: '上次生成已中断，请重新发送' })
        }
      }
    }
  }

  function createAssistant() {
    messages.value.push({
      id: uid('assistant'),
      role: 'assistant',
      status: 'streaming',
      parts: []
    })
    return messages.value[messages.value.length - 1]
  }

  function applyEvent(msg, event, data) {
    if (event === 'text_delta') {
      const last = msg.parts[msg.parts.length - 1]
      if (last && last.type === 'text') {
        last.text += data.delta || ''
      } else {
        msg.parts.push({ type: 'text', text: data.delta || '' })
      }
      return
    }

    if (event === 'tool_start') {
      msg.parts.push({
        type: 'tool',
        id: data.id,
        name: data.name,
        args: data.args || {},
        state: 'running',
        result: null
      })
      return
    }

    if (event === 'tool_end') {
      const toolPart = msg.parts.find((p) => p.type === 'tool' && p.id === data.id)
      if (toolPart) {
        toolPart.state = 'done'
        toolPart.result = data.result
      } else {
        msg.parts.push({
          type: 'tool',
          id: data.id,
          name: data.name,
          args: data.args || {},
          state: 'done',
          result: data.result
        })
      }
      return
    }

    if (event === 'error') {
      msg.parts.push({ type: 'error', text: data.message || '未知错误' })
      status.value = 'error'
      errorMessage.value = data.message || '未知错误'
    }
  }

  /**
   * 发送一条用户消息，并消费后端 SSE 流式响应。
   * 流程：校验 → 更新本地消息 → 组历史 → fetch → 解析 event/data → 收尾
   */
  async function sendMessage(rawText) {
    const content = (rawText ?? input.value).trim()
    if (!content || isStreaming.value) return

    settleStaleAssistants()
    appendUser(content)
    input.value = ''
    status.value = 'streaming'
    errorMessage.value = ''

    const assistant = createAssistant()
    abortController = new AbortController()
    let timedOut = false
    let gotContent = false

    const history = messages.value
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(0, -1)
      .map((m) => ({
        role: m.role,
        content: m.parts
          .filter((p) => p.type === 'text')
          .map((p) => p.text)
          .join('')
      }))
      .filter((m) => m.content)
    history.push({ role: 'user', content })

    const timeoutId = setTimeout(() => {
      if (!gotContent && abortController) {
        timedOut = true
        abortController.abort()
      }
    }, 15000)

    try {
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
        signal: abortController.signal
      })

      if (!res.ok || !res.body) {
        throw new Error(`请求失败: ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const blocks = buffer.split('\n\n')
        buffer = blocks.pop() || ''

        for (const block of blocks) {
          const lines = block.split('\n')
          let event = 'message'
          let dataLine = ''
          for (const line of lines) {
            if (line.startsWith('event:')) event = line.slice(6).trim()
            if (line.startsWith('data:')) dataLine += line.slice(5).trim()
          }
          if (!dataLine) continue
          let data
          try {
            data = JSON.parse(dataLine)
          } catch (_) {
            continue
          }
          if (event === 'done') {
            if (data.mode) mode.value = data.mode
            continue
          }
          if (event === 'text_delta' || event === 'tool_start' || event === 'tool_end') {
            gotContent = true
            clearTimeout(timeoutId)
          }
          applyEvent(assistant, event, data)
        }
      }

      if (!gotContent && !assistant.parts.length) {
        assistant.parts.push({ type: 'error', text: '未收到任何内容，请稍后重试' })
        assistant.status = 'error'
        status.value = 'error'
      } else {
        assistant.status = 'done'
        if (status.value !== 'error') status.value = 'idle'
      }
    } catch (err) {
      if (timedOut) {
        assistant.parts.push({ type: 'error', text: '等待超时，请重试' })
        assistant.status = 'error'
        status.value = 'error'
        errorMessage.value = 'timeout'
      } else if (err.name === 'AbortError') {
        assistant.parts.push({ type: 'text', text: '\n\n（已停止生成）' })
        assistant.status = 'aborted'
        status.value = 'idle'
      } else {
        assistant.parts.push({ type: 'error', text: err.message || '网络异常' })
        assistant.status = 'error'
        status.value = 'error'
        errorMessage.value = err.message || '网络异常'
      }
    } finally {
      clearTimeout(timeoutId)
      abortController = null
      if (assistant.status === 'streaming') {
        assistant.status = 'error'
        if (!assistant.parts.length) {
          assistant.parts.push({ type: 'error', text: '生成中断，请重试' })
        }
        if (status.value === 'streaming') status.value = 'error'
      }
    }
  }

  function stop() {
    if (abortController) abortController.abort()
  }

  async function sendFeedback(messageId, value) {
    await fetch(apiUrl('/api/feedback'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, value })
    })
  }

  return {
    messages,
    input,
    status,
    mode,
    errorMessage,
    isStreaming,
    refreshHealth,
    sendMessage,
    stop,
    sendFeedback
  }
})
