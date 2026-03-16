<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import { request } from '../apis/request'
import { useAuthStore } from '../src/stores/auth'
import './styles/auth-pages.css'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const rememberPassword = ref(true)
const hitokoto = ref('正在加载一言...')
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
    ElMessage.warning('请输入用户名和密码')
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
      throw new Error('登录成功但未返回 token')
    }

    authStore.setToken(token)

    // 当前认证 store 默认持久化 token。
    // 当用户关闭“记住密码”时，仅做交互提示，不影响接口联调链路。
    if (!rememberPassword.value) {
      ElMessage.info('本项目当前默认持久化 token，可后续扩展为会话态')
    }

    ElMessage.success('登录成功，正在进入测试页面')
    await router.push('/api-test')
  } catch (error) {
    ElMessage.error(error?.message || '登录失败，请检查账号和密码')
  } finally {
    loading.value = false
  }
}

function goToApiTest() {
  router.push('/api-test')
}

async function fetchHitokoto() {
  try {
    const response = await fetch('https://v1.hitokoto.cn/?encode=json')
    const payload = await response.json()

    hitokoto.value = payload?.hitokoto || '愿你走出半生，归来仍是少年。'
    hitokotoFrom.value = payload?.from || ''
  } catch {
    hitokoto.value = '风起于青萍之末，浪成于微澜之间。'
    hitokotoFrom.value = '一言'
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
    <div class="auth-shell">
      <div class="auth-brand">
        <h1 class="auth-title">人事管理系统</h1>
        <p class="auth-quote">{{ hitokoto }}</p>
        <small v-if="hitokotoFrom" class="auth-from">- {{ hitokotoFrom }} -</small>
      </div>

      <el-form class="auth-form" :model="loginForm" @submit.prevent="handleLogin">
        <el-form-item>
          <el-input
            v-model="loginForm.username"
            placeholder="用户名"
            autocomplete="username"
            class="auth-input"
            size="large"
          />
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="loginForm.password"
            placeholder="密码"
            type="password"
            autocomplete="current-password"
            show-password
            class="auth-input"
            size="large"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-button class="auth-primary-button" type="primary" size="large" :loading="loading" @click="handleLogin">
          登录
        </el-button>

        <div class="auth-extra-row">
          <el-checkbox v-model="rememberPassword" class="auth-checkbox">记住密码</el-checkbox>
          <a href="#" class="auth-link" @click.prevent="goToRegister">创建账号</a>
        </div>
      </el-form>
    </div>
  </div>
</template>
