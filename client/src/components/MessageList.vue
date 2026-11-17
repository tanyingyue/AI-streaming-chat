<template>
  <div ref="scroller" class="list">
    <div v-if="!messages.length" class="empty">
      发送一条消息开始。左侧有示例问法。
    </div>

    <div v-for="msg in messages" :key="msg.id" class="row" :data-role="msg.role">
      <div class="bubble">
        <div class="role">{{ msg.role === 'user' ? '你' : '助手' }}</div>

        <template v-for="(part, idx) in msg.parts" :key="idx">
          <p v-if="part.type === 'text'" class="text">{{ part.text }}</p>
          <ToolCard v-else-if="part.type === 'tool'" :part="part" />
          <p v-else-if="part.type === 'error'" class="error">{{ part.text }}</p>
        </template>

        <!-- 首包到达前给反馈，避免空气泡像「卡住」 -->
        <div
          v-if="msg.role === 'assistant' && msg.status === 'streaming' && !msg.parts.length"
          class="typing"
          aria-live="polite"
        >
          <span class="dot" /><span class="dot" /><span class="dot" />
          <span class="typing-label">正在生成…</span>
        </div>

        <div v-if="msg.role === 'assistant' && msg.status !== 'streaming'" class="actions">
          <button type="button" @click="onFeedback(msg.id, 'up')">有用</button>
          <button type="button" @click="onFeedback(msg.id, 'down')">没用</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '../stores/chat'
import ToolCard from './ToolCard.vue'

const chat = useChatStore()
const { messages } = storeToRefs(chat)
const scroller = ref(null)

watch(
  messages,
  async () => {
    await nextTick()
    if (scroller.value) {
      scroller.value.scrollTop = scroller.value.scrollHeight
    }
  },
  { deep: true }
)

async function onFeedback(messageId, value) {
  await chat.sendFeedback(messageId, value)
}
</script>

<style scoped>
.list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 20px;
}

.empty {
  color: var(--muted);
  text-align: center;
  margin-top: 80px;
}

.row {
  display: flex;
  margin-bottom: 14px;
}

.row[data-role='user'] {
  justify-content: flex-end;
}

.bubble {
  max-width: min(680px, 92%);
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--assistant);
}

.row[data-role='user'] .bubble {
  background: var(--primary-soft);
  border-color: #bfdbfe;
}

.role {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
}

.text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
}

.error {
  margin: 8px 0 0;
  color: var(--danger);
}

.actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}

.actions button {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}

.typing {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  color: var(--muted);
  font-size: 13px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--primary);
  opacity: 0.35;
  animation: blink 1.2s infinite ease-in-out;
}

.dot:nth-child(2) {
  animation-delay: 0.2s;
}

.dot:nth-child(3) {
  animation-delay: 0.4s;
}

.typing-label {
  margin-left: 4px;
}

@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
}
</style>
