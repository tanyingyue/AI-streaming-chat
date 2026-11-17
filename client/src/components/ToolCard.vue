<template>
  <div class="tool" :data-state="part.state">
    <div class="head">
      <span class="icon">🔧</span>
      <strong>{{ part.name }}</strong>
      <span class="state">{{ stateLabel }}</span>
    </div>
    <pre class="block">参数：{{ pretty(part.args) }}</pre>
    <pre v-if="part.state === 'done'" class="block">结果：{{ pretty(part.result) }}</pre>
    <RouterLink
      v-if="orderId"
      class="link"
      :to="`/orders/${orderId}`"
    >
      打开订单详情 {{ orderId }} →
    </RouterLink>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  part: { type: Object, required: true }
})

const stateLabel = computed(() => (props.part.state === 'running' ? '执行中…' : '已完成'))

const orderId = computed(() => {
  const fromArgs = props.part.args?.orderId
  const fromResult = props.part.result?.orderId
  return (fromResult || fromArgs || '').toString().toUpperCase() || ''
})

function pretty(value) {
  try {
    return JSON.stringify(value, null, 2)
  } catch (_) {
    return String(value)
  }
}
</script>

<style scoped>
.tool {
  margin-top: 10px;
  border: 1px dashed #93c5fd;
  background: #eff6ff;
  border-radius: 12px;
  padding: 10px 12px;
}

.tool[data-state='running'] {
  border-style: solid;
}

.head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.state {
  margin-left: auto;
  font-size: 12px;
  color: var(--muted);
}

.block {
  margin: 0 0 8px;
  padding: 8px;
  background: #fff;
  border-radius: 8px;
  font-size: 12px;
  overflow: auto;
}

.link {
  font-size: 13px;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}
</style>
