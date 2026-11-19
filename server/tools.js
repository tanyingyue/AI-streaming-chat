import { getOrder } from './orders.js'

/** 暴露给模型的 tool 定义（OpenAI function calling 格式） */
export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'getOrder',
      description: '根据采购订单号查询订单状态、采购员、供应商、金额等信息',
      parameters: {
        type: 'object',
        properties: {
          orderId: {
            type: 'string',
            description: '采购订单号，例如 PO-1001'
          }
        },
        required: ['orderId']
      }
    }
  }
]

/** 服务端真正执行 tool（权限/数据只在这里碰） */
export async function executeTool(name, args = {}) {
  if (name === 'getOrder') {
    return await getOrder(args.orderId)
  }
  return { error: `未知工具: ${name}` }
}
