<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import { request } from '../apis/request'
import { useAuthStore } from '../src/stores/auth'
import { toggleLocale } from '../utils/i18n'
import './styles/auth-pages.css'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const loading = ref(false)
const rememberPassword = ref(true)
const hitokoto = ref(t('auth.loadingQuote'))
const hitokotoFrom = ref('')

// 登录表单。
const loginForm = reactive({
  username: '',
  password: '',
})

// 从登录响应中提取 token，兼容多种后端返回结构。
function extractToken(payload) {
  return (
    payload?.data?.token ||
    payload?.token ||
    (typeof payload?.data === 'string' ? payload.data : '') ||
    (typeof payload === 'string' ? payload : '')
  )
}

async function handleLogin() {
  if (!loginForm.username.trim() || !loginForm.password.trim()) {
    ElMessage.warning(t('auth.loginMissingFields'))
    return
  }

  loading.value = true

  try {
    // 使用 unwrap: false 保留完整响应结构，便于兼容不同后端返回格式。
    const result = await request({
      url: '/api/login',
      method: 'POST',
      withAuth: false,
      unwrap: false,
      data: {
        username: loginForm.username.trim(),
        password: loginForm.password,
      },
    })

    const token = extractToken(result)

    if (!token) {
      throw new Error(t('auth.loginTokenMissing'))
    }

    authStore.setToken(token)

    // 当前认证 store 默认持久化 token。
    // 当用户关闭“记住密码”时，仅做交互提示，不影响接口联调链路。
    if (!rememberPassword.value) {
      ElMessage.info(t('auth.loginPersistInfo'))
    }

    ElMessage.success(t('auth.loginSuccess'))
      await router.push('/dashboard')
  } catch (error) {
    ElMessage.error(error?.message || t('auth.loginFailed'))
  } finally {
    loading.value = false
  }
}

async function fetchHitokoto() {
  try {
    const response = await fetch('https://v1.hitokoto.cn/?encode=json')
    const payload = await response.json()

    hitokoto.value = payload?.hitokoto || t('auth.fallbackQuote')
    hitokotoFrom.value = payload?.from || ''
  } catch {
    hitokoto.value = t('auth.fallbackQuote')
    hitokotoFrom.value = t('auth.fallbackFrom')
  }
}

function goToRegister() {
  router.push('/register')
}

onMounted(() => {
  // 每次进入登录页都会重新拉取一言文案，刷新页面也会触发。
  fetchHitokoto()
})
</script>

<template>
  <div class="auth-page">
    <button class="auth-locale-button" type="button" @click="toggleLocale">
      {{ t('common.switchTo') }}
    </button>

    <div class="auth-logo-side">
      <div class="auth-brand">
        <h1 class="auth-logo-title">Vue CMS</h1>
        <p class="auth-logo-subtitle">{{ hitokoto }}</p>
        <small v-if="hitokotoFrom" class="auth-logo-subtitle">- {{ hitokotoFrom }} -</small>
      </div>
    </div>

    <div class="auth-side-container">
      <div class="auth-glass-effect"></div>

      <div class="auth-shell">
        <div class="auth-brand">
          <h2 class="auth-welcome-title">{{ t('auth.loginTitle') }}</h2>
          <div class="auth-divider"></div>
        </div>

        <el-form class="auth-form" :model="loginForm" @submit.prevent="handleLogin">
          <el-form-item>
            <el-input
              v-model="loginForm.username"
              :placeholder="t('auth.username')"
              autocomplete="username"
              class="auth-input"
              size="large"
            />
          </el-form-item>

          <el-form-item>
            <el-input
              v-model="loginForm.password"
              :placeholder="t('auth.password')"
              type="password"
              autocomplete="current-password"
              show-password
              class="auth-input"
              size="large"
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-button class="auth-primary-button" type="primary" size="large" :loading="loading" @click="handleLogin">
            {{ t('auth.loginButton') }}
          </el-button>

          <div class="auth-extra-row">
            <el-checkbox v-model="rememberPassword" class="auth-checkbox">{{ t('auth.rememberPassword') }}</el-checkbox>
            <a href="#" class="auth-link" @click.prevent="goToRegister">{{ t('auth.createAccount') }}</a>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>
