<template>
  <div class="chat-layout">
    <aside class="side">
      <h3>可以这样问</h3>
      <button v-for="q in samples" :key="q" class="chip" type="button" @click="fill(q)">
        {{ q }}
      </button>
      <p class="tip">
        默认 Mock 模式即可演示完整协议。配置
        <code>server/.env</code>
        后可接真模型。
      </p>
    </aside>

    <section class="panel">
      <MessageList />
      <Composer />
    </section>
  </div>
</template>

<script setup>
import { useChatStore } from '../stores/chat'
import MessageList from '../components/MessageList.vue'
import Composer from '../components/Composer.vue'

const chat = useChatStore()

const samples = [
  'PO-1001 审批到哪了？',
  '帮我查一下订单 PO-1002',
  'PO-1003 是谁负责的？'
]

function fill(q) {
  // Pinia 会自动解包 ref，直接赋值即可
  chat.input = q
}
</script>

<style scoped>
.chat-layout {
  width: min(1100px, 100%);
  height: calc(100vh - 100px);
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 16px;
  min-height: 0;
  align-items: stretch;
}

.side,
.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow);
}

.side {
  padding: 16px;
  height: fit-content;
}

.side h3 {
  margin: 0 0 12px;
  font-size: 14px;
}

.chip {
  display: block;
  width: 100%;
  text-align: left;
  margin-bottom: 8px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
}

.chip:hover {
  border-color: var(--primary);
  background: var(--primary-soft);
}

.tip {
  margin-top: 16px;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.6;
}

.panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

@media (max-width: 860px) {
  .chat-layout {
    grid-template-columns: 1fr;
  }
}
</style>
