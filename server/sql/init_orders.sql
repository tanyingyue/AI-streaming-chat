-- 在已有库 ocp_dev 中建表（与 server/.env 的 DB_DATABASE=ocp_dev 一致）
-- 用法：Navicat 打开 ocp_dev → 新建查询 → 执行本文件
-- 说明：当前账号通常无建库权限，不要 CREATE DATABASE；直接 USE 已有库即可。

USE ocp_dev;

CREATE TABLE IF NOT EXISTS orders (
  order_id   VARCHAR(32)  NOT NULL PRIMARY KEY COMMENT '采购订单号',
  status     VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '订单状态',
  buyer      VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '采购员',
  supplier   VARCHAR(128) NOT NULL DEFAULT '' COMMENT '供应商',
  amount     DECIMAL(12, 2) NOT NULL DEFAULT 0 COMMENT '金额（元）',
  material   VARCHAR(128) NOT NULL DEFAULT '' COMMENT '物料',
  updated_at VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采购订单（学习用）';

INSERT INTO orders (order_id, status, buyer, supplier, amount, material, updated_at) VALUES
  ('PO-1001', '待财务审批', '张三', '华南原料有限公司', 128000, '茶叶原料 A', '2026-03-10 14:20'),
  ('PO-1002', '已发布', '李四', '东海包装股份', 56000, '包装纸箱', '2026-03-11 09:05'),
  ('PO-1003', '草稿', '王五', '未指定', 0, '辅料待确认', '2026-03-12 11:40')
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  buyer = VALUES(buyer),
  supplier = VALUES(supplier),
  amount = VALUES(amount),
  material = VALUES(material),
  updated_at = VALUES(updated_at);
