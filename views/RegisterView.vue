<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import { register } from '../apis/public'
import './styles/auth-pages.css'

const router = useRouter()

const loading = ref(false)

const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  role: 'staff',
})

async function handleRegister() {
  const username = registerForm.username.trim()
  const password = registerForm.password
  const confirmPassword = registerForm.confirmPassword

  if (!username || !password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  if (password !== confirmPassword) {
    ElMessage.warning('两次输入的密码不一致')
    return
  }

  loading.value = true

  try {
    await register({
      username,
      password,
      role: registerForm.role,
    })

    ElMessage.success('创建账号成功，请返回登录')
    await router.push('/login')
  } catch (error) {
    ElMessage.error(error?.message || '创建账号失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-shell">
      <div class="auth-brand">
        <h1 class="auth-title">创建账号</h1>
      </div>

      <el-form class="auth-form" :model="registerForm" @submit.prevent="handleRegister">
        <el-form-item>
          <el-input
            v-model="registerForm.username"
            placeholder="用户名"
            autocomplete="username"
            class="auth-input"
            size="large"
          />
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="registerForm.password"
            placeholder="密码"
            type="password"
            autocomplete="new-password"
            show-password
            class="auth-input"
            size="large"
          />
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="registerForm.confirmPassword"
            placeholder="确认密码"
            type="password"
            autocomplete="new-password"
            show-password
            class="auth-input"
            size="large"
            @keyup.enter="handleRegister"
          />
        </el-form-item>

        <el-button class="auth-primary-button" type="primary" size="large" :loading="loading" @click="handleRegister">
          创建账号
        </el-button>

        <div class="auth-extra-row">
          <a href="#" class="auth-link" @click.prevent="goToLogin">已有账号？返回登录</a>
        </div>
      </el-form>
    </div>
  </div>
</template>