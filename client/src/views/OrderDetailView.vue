<template>
  <div class="detail">
    <RouterLink class="back" to="/">← 返回对话</RouterLink>
    <h2>订单详情 {{ id }}</h2>
    <p class="desc">演示：Tool 结果可跳转到业务页（企业场景加分点）</p>

    <div v-if="loading" class="card">加载中…</div>
    <div v-else-if="!order?.found" class="card">{{ order?.message || '未找到' }}</div>
    <div v-else class="card">
      <div class="row"><span>订单号</span><strong>{{ order.orderId }}</strong></div>
      <div class="row"><span>状态</span><strong>{{ order.status }}</strong></div>
      <div class="row"><span>采购员</span><strong>{{ order.buyer }}</strong></div>
      <div class="row"><span>供应商</span><strong>{{ order.supplier }}</strong></div>
      <div class="row"><span>金额</span><strong>¥{{ order.amount }}</strong></div>
      <div class="row"><span>物料</span><strong>{{ order.material }}</strong></div>
      <div class="row"><span>更新时间</span><strong>{{ order.updatedAt }}</strong></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'

const props = defineProps({
  id: { type: String, required: true }
})

const order = ref(null)
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const base = import.meta.env.VITE_API_BASE || ''
    const res = await fetch(`${base}/api/orders/${props.id}`)
    order.value = await res.json()
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.id, load)
</script>

<style scoped>
.detail {
  width: min(720px, 100%);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow);
  padding: 24px;
}

.back {
  text-decoration: none;
  font-size: 14px;
}

h2 {
  margin: 12px 0 6px;
}

.desc {
  margin: 0 0 16px;
  color: var(--muted);
  font-size: 13px;
}

.card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px 4px;
}

.row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.row:last-child {
  border-bottom: none;
}

.row span {
  color: var(--muted);
}
</style>
