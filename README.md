# 对话式 AI 学习项目（Vue3 + Node 薄 BFF）

采购/订单场景的迷你助手，用来练：

- SSE 流式输出
- 停止生成（AbortController）
- Tool 调用卡片（查订单）
- 密钥只放服务端
- 点赞/点踩反馈

## 环境要求

- **Node.js 20 LTS**（推荐；不要用 14）
- npm 10+

切换示例（nvm-windows）：

```bash
nvm install 20
nvm use 20
node -v   # 应显示 v20.x
```

## 安装与启动

在项目根目录执行：

```bash
cd "D:\A茶百道-code\AI-流式对话"

# ---------- 安装依赖 ----------
# 一次性安装：根目录 + server（后端）+ client（前端）
npm run install:all

# ---------- 启动（推荐：前后端一起）----------
# 同时启动后端 Express(:3001) + 前端 Vite(:5173)
npm run dev

# ---------- 也可分开启动 ----------
# 仅后端：http://localhost:3001
npm run dev:server

# 仅前端：http://localhost:5173（/api 会代理到后端）
npm run dev:client
```

| 命令 | 作用 | 访问地址 |
|------|------|----------|
| `npm run install:all` | 安装根目录、后端、前端全部依赖 | — |
| `npm run dev` | 同时启动前后端 | 前端 5173 / 后端 3001 |
| `npm run dev:server` | 只启动后端（`server/`） | http://localhost:3001 |
| `npm run dev:client` | 只启动前端（`client/`） | http://localhost:5173 |

## （可选）Nginx 反代 —— 模拟测试环境

日常学习用 `npm run dev` 即可。若想体验接近企业测试环境的「网关反代」：

```bash
# 1. 打包前端（生产构建后 API 走相对路径 /api，由 Nginx 转发）
npm run build --prefix client

# 2. 只起后端
npm run dev:server

# 3. 启动 Nginx（使用仓库内配置，按本机路径改 deploy/nginx.conf 里的 root）
nginx -c "D:/A茶百道-code/AI-流式对话/deploy/nginx.conf"
```

浏览器打开：**http://127.0.0.1:8080**

| 路径 | Nginx 转到 |
|------|------------|
| `/` | `client/dist` 静态页 |
| `/api/*` | `http://127.0.0.1:3001`（含 SSE，已关 `proxy_buffering`） |

配置文件：`deploy/nginx.conf`。未安装 Nginx 可先跳过本段。

## 模式说明

| 模式 | 条件 | 效果 |
|------|------|------|
| Mock（默认） | 不配 `LLM_API_KEY` | 本地模拟流式 + 自动调 `getOrder` |
| 真模型 | `server/.env` 配好 Key | 走 OpenAI 兼容 Chat Completions + tools |

```bash
copy .env.example server\.env
# 编辑 server\.env 填入 LLM_API_KEY 等
```

## 试着问

- `PO-1001 审批到哪了？`
- `帮我查一下订单 PO-1002`
- `PO-1003 是谁负责的？`

## 建议学习顺序

1. 先 Mock 跑通，看 Network 里 SSE 事件
2. 读 `server/index.js` 的事件协议与 tool 执行
3. 读 `client/src/stores/chat.js`（Pinia）的拼消息与停止
4. 再配真 Key 对比行为差异

## 简历可写能力点

- 独立实现流式对话（含中断）
- Tool Call 可视化与前后端事件协议
- Node BFF 保管密钥并执行业务工具
