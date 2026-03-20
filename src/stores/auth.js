import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  clearAuthToken,
  getStoredToken,
  saveAuthToken,
  setTokenPersistence,
  setTokenResolver,
} from '../../apis/request'

export const useAuthStore = defineStore('auth', () => {
  // token 先从本地缓存恢复，保证页面刷新后请求层仍可继续工作。
  const token = ref(getStoredToken())

  const isAuthenticated = computed(() => Boolean(token.value))

  // 从 localStorage 重新同步 token。
  // 适合应用启动时或外部手动改动缓存后调用。
  function hydrateToken() {
    token.value = getStoredToken()
  }

  // 写入新的登录 token，并同步持久化。
  function setToken(nextToken, { remember = true } = {}) {
    const normalizedToken = typeof nextToken === 'string' ? nextToken.trim() : ''

    token.value = normalizedToken

    if (normalizedToken) {
      const persistence = remember ? 'local' : 'session'
      setTokenPersistence(persistence)
      saveAuthToken(normalizedToken, { persistence })
      return
    }

    clearAuthToken()
  }

  // 清空当前登录态。
  function clearToken() {
    token.value = ''
    clearAuthToken()
  }

  // 将 Pinia 中的 token 暴露给请求层。
  // 请求发起时会优先读这里，读不到时再回退到 localStorage。
  function registerTokenResolver() {
    setTokenResolver(() => token.value || getStoredToken())
  }

  return {
    token,
    isAuthenticated,
    hydrateToken,
    setToken,
    clearToken,
    registerTokenResolver,
  }
})