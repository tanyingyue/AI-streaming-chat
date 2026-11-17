/** 模拟 SRM 订单主数据（tool 查询用） */
export const ORDERS = {
  'PO-1001': {
    orderId: 'PO-1001',
    status: '待财务审批',
    buyer: '张三',
    supplier: '华南原料有限公司',
    amount: 128000,
    material: '茶叶原料 A',
    updatedAt: '2026-03-10 14:20'
  },
  'PO-1002': {
    orderId: 'PO-1002',
    status: '已发布',
    buyer: '李四',
    supplier: '东海包装股份',
    amount: 56000,
    material: '包装纸箱',
    updatedAt: '2026-03-11 09:05'
  },
  'PO-1003': {
    orderId: 'PO-1003',
    status: '草稿',
    buyer: '王五',
    supplier: '未指定',
    amount: 0,
    material: '辅料待确认',
    updatedAt: '2026-03-12 11:40'
  }
}

export function getOrder(orderId) {
  const key = String(orderId || '').trim().toUpperCase()
  const order = ORDERS[key]
  if (!order) {
    return { found: false, orderId: key, message: `未找到订单 ${key}` }
  }
  return { found: true, ...order }
}
