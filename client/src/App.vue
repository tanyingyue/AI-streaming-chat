<template>
  <div class="app-shell">
    <header class="topbar">
      <div>
        <div class="brand">采购助手 · 对话式 AI</div>
        <div class="sub">Vue3 + Node 薄 BFF · SSE / Tool / 停止生成</div>
      </div>
      <div class="mode" :data-mode="modeLabel">模式：{{ modeLabel }}</div>
    </header>
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from './stores/chat'

const chat = useChatStore()
const { mode } = storeToRefs(chat)

const modeLabel = computed(() => {
  if (mode.value === 'mock') return 'Mock（无需 Key）'
  if (mode.value === 'llm') return '真模型'
  if (mode.value === 'offline') return '后端未连接'
  return '检测中…'
})

onMounted(() => {
  chat.refreshHealth()
})
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: #0f172a;
  color: #fff;
}

.brand {
  font-size: 18px;
  font-weight: 700;
}

.sub {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.75;
}

.mode {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 12px;
}

.mode[data-mode='真模型'] {
  background: #065f46;
}

.mode[data-mode='后端未连接'] {
  background: #7f1d1d;
}

.main {
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: center;
  padding: 20px;
  overflow: hidden;
}
</style>
