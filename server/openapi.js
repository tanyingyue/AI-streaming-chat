/**
 * OpenAPI 3 文档（可供 Swagger UI / Apifox 导入）
 * 修改接口后请同步更新本文件。
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'AI 流式对话 BFF',
    version: '1.0.0',
    description:
      '采购助手薄 BFF。/api/chat 为 SSE（text/event-stream），Apifox 对 SSE 调试有限，建议用浏览器 Network → EventStream 联调。'
  },
  servers: [
    { url: 'http://127.0.0.1:3001', description: '本地后端' },
    { url: 'http://127.0.0.1:5173', description: '经 Vite 代理（开发）' }
  ],
  paths: {
    '/api/health': {
      get: {
        summary: '健康检查 / 当前模式',
        tags: ['系统'],
        responses: {
          200: {
            description: '服务正常',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: {
                      type: 'boolean',
                      description: '服务是否正常',
                      example: true
                    },
                    mode: {
                      type: 'string',
                      enum: ['mock', 'llm'],
                      description: '运行模式：mock=本地模拟；llm=已配置大模型 Key'
                    },
                    model: {
                      type: 'string',
                      nullable: true,
                      description: '当前大模型名称；mock 模式下多为 null',
                      example: 'glm-4-flash'
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/feedback': {
      post: {
        summary: '消息点赞/点踩',
        tags: ['反馈'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['messageId', 'value'],
                properties: {
                  messageId: {
                    type: 'string',
                    description: '助手消息 ID（前端 messages 里该条 id）',
                    example: 'asst_xxx'
                  },
                  value: {
                    type: 'string',
                    enum: ['up', 'down'],
                    description: '反馈：up=有用，down=没用'
                  },
                  comment: {
                    type: 'string',
                    description: '可选补充说明',
                    example: ''
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: '已记录',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { ok: { type: 'boolean', example: true } }
                }
              }
            }
          },
          400: {
            description: '参数错误',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: false },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/chat': {
      post: {
        summary: '对话（SSE 流式）',
        description: [
          '响应 Content-Type: text/event-stream。',
          '事件：text_delta / tool_start / tool_end / error / done。',
          '浏览器打开 EventStream 面板查看推流；普通「响应」预览不适用。'
        ].join('\n'),
        tags: ['对话'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  messages: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['role', 'content'],
                      properties: {
                        role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                        content: { type: 'string' }
                      }
                    },
                    example: [{ role: 'user', content: 'PO-1001 审批到哪了？' }]
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'SSE 事件流',
            content: {
              'text/event-stream': {
                schema: {
                  type: 'string',
                  example:
                    'event: text_delta\ndata: {"delta":"订单"}\n\nevent: done\ndata: {"mode":"llm"}\n\n'
                }
              }
            }
          }
        }
      }
    },
    '/api/orders/{id}': {
      get: {
        summary: '查询订单详情',
        tags: ['订单'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', example: 'PO-1001' },
            description: '采购订单号'
          }
        ],
        responses: {
          200: {
            description:
              '查询结果。found=true 时含订单明细；found=false 时仅有 orderId 与 message。',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['found', 'orderId'],
                  properties: {
                    found: {
                      type: 'boolean',
                      description: '是否查到订单：true=存在，false=不存在'
                    },
                    orderId: {
                      type: 'string',
                      description: '采购订单号（统一大写，如 PO-1001）',
                      example: 'PO-1001'
                    },
                    status: {
                      type: 'string',
                      description: '订单业务状态，如：草稿 / 待财务审批 / 已发布',
                      example: '待财务审批'
                    },
                    buyer: {
                      type: 'string',
                      description: '采购员姓名',
                      example: '张三'
                    },
                    supplier: {
                      type: 'string',
                      description: '供应商名称',
                      example: '华南原料有限公司'
                    },
                    amount: {
                      type: 'number',
                      description: '订单金额（元）',
                      example: 128000
                    },
                    material: {
                      type: 'string',
                      description: '物料/采购品名称',
                      example: '茶叶原料 A'
                    },
                    updatedAt: {
                      type: 'string',
                      description: '订单信息最后更新时间',
                      example: '2026-03-10 14:20'
                    },
                    message: {
                      type: 'string',
                      description: '未找到订单时的提示文案；found=true 时通常无此字段'
                    }
                  }
                },
                example: {
                  found: true,
                  orderId: 'PO-1001',
                  status: '待财务审批',
                  buyer: '张三',
                  supplier: '华南原料有限公司',
                  amount: 128000,
                  material: '茶叶原料 A',
                  updatedAt: '2026-03-10 14:20'
                }
              }
            }
          }
        }
      }
    }
  },
  tags: [
    { name: '系统' },
    { name: '对话' },
    { name: '反馈' },
    { name: '订单' }
  ]
}
