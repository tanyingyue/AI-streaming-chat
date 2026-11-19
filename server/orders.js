import { getPool, isDbConfigured } from './db.js'

/** 未接库时的内存假数据（学习兜底） */
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

function fromMemory(orderId) {
  const order = ORDERS[orderId]
  if (!order) {
    return { found: false, orderId, message: `未找到订单 ${orderId}` }
  }
  return { found: true, ...order }
}

async function fromMysql(orderId) {
  const pool = getPool()
  const [rows] = await pool.query(
    `SELECT order_id, status, buyer, supplier, amount, material, updated_at
     FROM orders WHERE order_id = ? LIMIT 1`,
    [orderId]
  )
  const row = rows[0]
  if (!row) {
    return { found: false, orderId, message: `未找到订单 ${orderId}` }
  }
  return {
    found: true,
    orderId: row.order_id,
    status: row.status,
    buyer: row.buyer,
    supplier: row.supplier,
    amount: Number(row.amount),
    material: row.material,
    updatedAt: row.updated_at
  }
}

/**
 * 按订单号查询。
 * 配置了 DB_* 时查 MySQL；否则用内存 ORDERS。
 */
export async function getOrder(orderId) {
  const key = String(orderId || '').trim().toUpperCase()
  if (!key) {
    return { found: false, orderId: '', message: '订单号不能为空' }
  }

  if (!isDbConfigured()) {
    return fromMemory(key)
  }

  try {
    return await fromMysql(key)
  } catch (err) {
    console.error('[orders] MySQL 查询失败:', err.message)
    return {
      found: false,
      orderId: key,
      message: `数据库查询失败: ${err.message}`
    }
  }
}
