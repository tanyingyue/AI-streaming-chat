<template>
  <div class="composer">
    <textarea
      v-model="input"
      rows="3"
      placeholder="输入问题，例如：PO-1001 审批到哪了？"
      @keydown.enter.exact.prevent="onSend"
    />
    <div class="bar">
      <span class="hint">Enter 发送 · Shift+Enter 换行</span>
      <div class="btns">
        <button
          v-if="isStreaming"
          class="stop"
          type="button"
          @click="chat.stop()"
        >
          停止生成
        </button>
        <button
          class="send"
          type="button"
          :disabled="isStreaming || !input.trim()"
          @click="onSend"
        >
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useChatStore } from '../stores/chat'

const chat = useChatStore()
const { input, isStreaming } = storeToRefs(chat)

function onSend() {
  chat.sendMessage()
}
</script>

<style scoped>
.composer {
  flex-shrink: 0;
  border-top: 1px solid var(--border);
  padding: 14px;
  background: #fff;
}

textarea {
  width: 100%;
  resize: vertical;
  min-height: 72px;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  outline: none;
}

textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.bar {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.hint {
  font-size: 12px;
  color: var(--muted);
}

.btns {
  display: flex;
  gap: 8px;
}

button {
  border: none;
  border-radius: 10px;
  padding: 8px 14px;
  cursor: pointer;
}

.send {
  background: var(--primary);
  color: #fff;
}

.send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stop {
  background: #fee2e2;
  color: var(--danger);
}
</style>
