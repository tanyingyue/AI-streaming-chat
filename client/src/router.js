import { createRouter, createWebHistory } from 'vue-router'
import ChatView from './views/ChatView.vue'
import OrderDetailView from './views/OrderDetailView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'chat', component: ChatView },
    { path: '/orders/:id', name: 'order', component: OrderDetailView, props: true }
  ]
})
