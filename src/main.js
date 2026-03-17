import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import { i18n } from '../utils/i18n'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(ElementPlus)
app.use(i18n)

// 启动时注册认证 store，让请求层优先从 Pinia 读取 token。
// 即使 Pinia 中暂无 token，也会自动回退到 localStorage。
const authStore = useAuthStore(pinia)
authStore.hydrateToken()
authStore.registerTokenResolver()

app.use(router)

app.mount('#app')
