<script setup>
import { reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import { register } from '../apis/public'
import { toggleLocale } from '../utils/i18n'
import './styles/auth-pages.css'

const router = useRouter()
const { t } = useI18n()

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
    ElMessage.warning(t('auth.loginMissingFields'))
    return
  }

  if (password !== confirmPassword) {
    ElMessage.warning(t('auth.registerPasswordMismatch'))
    return
  }

  loading.value = true

  try {
    await register({
      username,
      password,
      role: registerForm.role,
    })

    ElMessage.success(t('auth.registerSuccess'))
    await router.push('/login')
  } catch (error) {
    ElMessage.error(error?.message || t('auth.registerFailed'))
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
    <button class="auth-locale-button" type="button" @click="toggleLocale">
      {{ t('common.switchTo') }}
    </button>

    <div class="auth-logo-side">
      <div class="auth-brand">
        <h1 class="auth-logo-title">Vue CMS</h1>
        <p class="auth-logo-subtitle">{{ t('auth.logoSub') }}</p>
      </div>
    </div>

    <div class="auth-side-container">
      <div class="auth-glass-effect"></div>

      <div class="auth-shell">
        <div class="auth-brand">
          <h2 class="auth-welcome-title">{{ t('auth.registerTitle') }}</h2>
          <div class="auth-divider"></div>
        </div>

        <el-form class="auth-form" :model="registerForm" @submit.prevent="handleRegister">
          <el-form-item>
            <el-input
              v-model="registerForm.username"
              :placeholder="t('auth.username')"
              autocomplete="username"
              class="auth-input"
              size="large"
            />
          </el-form-item>

          <el-form-item>
            <el-input
              v-model="registerForm.password"
              :placeholder="t('auth.password')"
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
              :placeholder="t('auth.confirmPassword')"
              type="password"
              autocomplete="new-password"
              show-password
              class="auth-input"
              size="large"
              @keyup.enter="handleRegister"
            />
          </el-form-item>

          <el-button class="auth-primary-button" type="primary" size="large" :loading="loading" @click="handleRegister">
            {{ t('auth.registerButton') }}
          </el-button>

          <div class="auth-footer-row">
            <a href="#" class="auth-link" @click.prevent="goToLogin">{{ t('auth.registerBackToLogin') }}</a>
          </div>
        </el-form>
      </div>
    </div>
  </div>
</template>
