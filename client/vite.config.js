import http from 'node:http'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * 自定义 /api 反向代理：对 SSE 做 pipe，避免默认 proxy 缓冲导致浏览器一直「正在生成…」
 */
function apiProxyPlugin() {
  return {
    name: 'api-streaming-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api')) return next()

        // 只转发必要头，避免 accept-encoding 等导致流异常
        const headers = {
          'content-type': req.headers['content-type'] || 'application/json',
          host: '127.0.0.1:3001',
          connection: 'keep-alive'
        }
        if (req.headers['content-length']) {
          headers['content-length'] = req.headers['content-length']
        }

        const proxyReq = http.request(
          {
            hostname: '127.0.0.1',
            port: 3001,
            path: req.url,
            method: req.method,
            headers
          },
          (proxyRes) => {
            const outHeaders = { ...proxyRes.headers }
            delete outHeaders['content-encoding']
            delete outHeaders['content-length']
            outHeaders['cache-control'] = 'no-cache, no-transform'
            outHeaders['x-accel-buffering'] = 'no'
            res.writeHead(proxyRes.statusCode || 502, outHeaders)
            proxyRes.pipe(res)
          }
        )

        proxyReq.on('error', (err) => {
          console.error('[api-proxy]', err.message)
          if (!res.headersSent) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
          }
          res.end(JSON.stringify({ ok: false, message: `后端不可达: ${err.message}` }))
        })

        req.pipe(proxyReq)
      })
    }
  }
}

export default defineConfig({
  plugins: [vue(), apiProxyPlugin()],
  server: {
    port: 5173,
    host: true,
    strictPort: true
  }
})
