import mysql from 'mysql2/promise'

let pool = null

/** 是否配置了 MySQL（未配则走内存假数据） */
export function isDbConfigured() {
  return Boolean(process.env.DB_HOST && process.env.DB_USER && process.env.DB_DATABASE)
}

/** 懒创建连接池 */
export function getPool() {
  if (!isDbConfigured()) return null
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE,
      waitForConnections: true,
      connectionLimit: 5,
      timezone: '+08:00'
    })
    console.log('[db] MySQL pool ready → %s/%s', process.env.DB_HOST, process.env.DB_DATABASE)
  }
  return pool
}
