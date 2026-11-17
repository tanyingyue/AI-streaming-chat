/** 统一 SSE 写出，方便前后端约定事件协议 */
export function initSse(res) {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.socket?.setNoDelay?.(true)
  res.flushHeaders?.()

  const send = (event, data) => {
    res.write(`event: ${event}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  return {
    send,
    textDelta: (delta) => send('text_delta', { delta }),
    toolStart: (payload) => send('tool_start', payload),
    toolEnd: (payload) => send('tool_end', payload),
    error: (message) => send('error', { message }),
    done: (extra = {}) => send('done', extra),
    close: () => res.end()
  }
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
