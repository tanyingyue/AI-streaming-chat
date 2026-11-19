import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initSse, sleep } from './sse.js'
import { TOOL_DEFINITIONS, executeTool } from './tools.js'
import { getOrder } from './orders.js'
import { openApiSpec } from './openapi.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '1mb' }))

// OpenAPI JSON，供 Apifox 导入
app.get('/api-docs.json', (_req, res) => {
  res.json(openApiSpec)
})

const feedbackStore = []

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    mode: process.env.LLM_API_KEY ? 'llm' : 'mock',
    model: process.env.LLM_MODEL || null
  })
})

app.post('/api/feedback', (req, res) => {
  const { messageId, value, comment } = req.body || {}
  if (!messageId || !['up', 'down'].includes(value)) {
    return res.status(400).json({ ok: false, message: 'messageId 与 value(up|down) 必填' })
  }
  feedbackStore.push({
    messageId,
    value,
    comment: comment || '',
    at: new Date().toISOString()
  })
  console.log('[feedback]', feedbackStore[feedbackStore.length - 1])
  res.json({ ok: true })
})

/**
 * 主聊天接口：SSE 推送
 * 事件协议：
 * - text_delta { delta }
 * - tool_start { id, name, args }
 * - tool_end   { id, name, result }
 * - error      { message }
 * - done       { mode }
 */
app.post('/api/chat', async (req, res) => {
  const { messages = [] } = req.body || {}
  const sse = initSse(res)
  // 仅在 socket 销毁 / 响应已结束时视为中断。
  // 不要用 req.on('close')：POST 读完 body 也可能触发，会空推流。
  // 也不要用 res.on('close') 过早 mark：经代理时可能误伤。
  const isClosed = () => Boolean(req.socket?.destroyed || res.writableEnded)
  console.log('[chat] start', { mode: process.env.LLM_API_KEY ? 'llm' : 'mock' })

  try {
    if (process.env.LLM_API_KEY) {
      await runWithLlm({ messages, sse, isClosed })
    } else {
      await runMock({ messages, sse, isClosed })
    }
    if (!isClosed()) sse.done({ mode: process.env.LLM_API_KEY ? 'llm' : 'mock' })
  } catch (err) {
    console.error(err)
    if (!isClosed()) sse.error(err.message || '服务异常')
  } finally {
    if (!res.writableEnded) sse.close()
    console.log('[chat] end')
  }
})

/** ---------- Mock：无 Key 也能演示完整协议 ---------- */
async function runMock({ messages, sse, isClosed }) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')
  const text = lastUser?.content || ''
  const orderMatch = text.match(/PO-\d+/i)
  const orderId = orderMatch ? orderMatch[0].toUpperCase() : 'PO-1001'

  const intro = `好的，我来帮你查询采购订单 ${orderId}。`
  for (const ch of intro) {
    if (isClosed()) return
    sse.textDelta(ch)
    await sleep(18)
  }

  const toolId = `tool_${Date.now()}`
  sse.toolStart({ id: toolId, name: 'getOrder', args: { orderId } })
  await sleep(400)
  if (isClosed()) return

  const result = await executeTool('getOrder', { orderId })
  sse.toolEnd({ id: toolId, name: 'getOrder', result })
  await sleep(200)
  if (isClosed()) return

  const summary = result.found
    ? `\n\n查询结果：订单 ${result.orderId} 当前状态为「${result.status}」，采购员 ${result.buyer}，供应商 ${result.supplier}，金额 ¥${result.amount}，物料 ${result.material}。可在系统中打开该单据详情继续处理。`
    : `\n\n${result.message}。可用示例：PO-1001、PO-1002、PO-1003。`

  for (const ch of summary) {
    if (isClosed()) return
    sse.textDelta(ch)
    await sleep(12)
  }
}

/** ---------- 真模型：OpenAI 兼容 + function calling ---------- */
async function runWithLlm({ messages, sse, isClosed }) {
  const baseUrl = (process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const model = process.env.LLM_MODEL || 'gpt-4o-mini'
  const apiKey = process.env.LLM_API_KEY

  const apiMessages = [
    {
      role: 'system',
      content:
        '你是采购 SRM 助手。当用户询问订单状态、审批进度、供应商等信息时，必须调用 getOrder 工具。回答简洁、用中文，并引用订单号。'
    },
    ...messages.map((m) => ({ role: m.role, content: m.content }))
  ]

  // 简化的多步：最多 3 轮（模型 -> tool -> 模型）
  for (let step = 0; step < 3; step++) {
    if (isClosed()) return

    console.log('[llm] step=%d 请求模型 model=%s messages=%d', step, model, apiMessages.length)

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: apiMessages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto'
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`LLM 请求失败: ${response.status} ${errText}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let assistantText = ''
    const toolCalls = new Map()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (isClosed()) {
        try {
          await reader.cancel()
        } catch (_) {}
        return
      }

      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n')
      buffer = chunks.pop() || ''

      for (const line of chunks) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') continue

        let json
        try {
          json = JSON.parse(data)
        } catch (_) {
          continue
        }

        const choice = json.choices?.[0]
        const delta = choice?.delta || {}

        if (delta.content) {
          assistantText += delta.content
          sse.textDelta(delta.content)
        }

        if (Array.isArray(delta.tool_calls)) {
          for (const part of delta.tool_calls) {
            const idx = part.index ?? 0
            if (!toolCalls.has(idx)) {
              toolCalls.set(idx, {
                id: part.id || `call_${idx}`,
                name: part.function?.name || '',
                argsText: part.function?.arguments || ''
              })
            } else {
              const cur = toolCalls.get(idx)
              if (part.id) cur.id = part.id
              if (part.function?.name) cur.name = part.function.name
              if (part.function?.arguments) cur.argsText += part.function.arguments
            }
          }
        }
      }
    }

    const toolNames = [...toolCalls.values()].map((c) => c.name).filter(Boolean)
    console.log(
      '[llm] step=%d 模型返回 textLen=%d tool_calls=%d %s',
      step,
      assistantText.length,
      toolCalls.size,
      toolNames.length ? toolNames.join(',') : '(无)'
    )

    if (toolCalls.size === 0) {
      console.log('[llm] step=%d 无工具调用，决策循环结束', step)
      return
    }

    // 执行 tools，并把结果喂回模型
    const assistantToolMsg = {
      role: 'assistant',
      content: assistantText || null,
      tool_calls: []
    }
    const toolResultMsgs = []

    for (const call of toolCalls.values()) {
      let args = {}
      try {
        args = JSON.parse(call.argsText || '{}')
      } catch (_) {
        args = {}
      }

      console.log('[llm] step=%d 执行工具 %s args=%j', step, call.name, args)
      sse.toolStart({ id: call.id, name: call.name, args })
      const result = await executeTool(call.name, args)
      if (isClosed()) return
      sse.toolEnd({ id: call.id, name: call.name, result })
      console.log('[llm] step=%d 工具完成 %s found=%s', step, call.name, result?.found)

      assistantToolMsg.tool_calls.push({
        id: call.id,
        type: 'function',
        function: {
          name: call.name,
          arguments: JSON.stringify(args)
        }
      })

      toolResultMsgs.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify(result)
      })
    }

    apiMessages.push(assistantToolMsg, ...toolResultMsgs)
    console.log('[llm] step=%d 工具结果已回填，进入下一轮', step)
  }

  console.log('[llm] 已达最大步数 3，结束循环')
}

// 给前端详情页用的只读接口（演示「结果可跳转业务页」）
app.get('/api/orders/:id', async (req, res) => {
  res.json(await getOrder(req.params.id))
})

app.listen(PORT, () => {
  console.log(`[server] http://localhost:${PORT}`)
  console.log(`[server] mode = ${process.env.LLM_API_KEY ? 'llm' : 'mock'}`)
  console.log(`[server] OpenAPI http://localhost:${PORT}/api-docs.json`)
})
