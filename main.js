
// #ifdef VUE3
import { createSSRApp } from 'vue'
import App from './App.vue'
export function createApp() {
  const app = createSSRApp(App)
  console.log('Vue 实例创建成功'); // 添加此行
  return {
    app
  }
}
// #endif