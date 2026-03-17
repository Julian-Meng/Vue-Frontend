import { createI18n } from 'vue-i18n'

const LOCALE_STORAGE_KEY = 'app_locale'
const SUPPORTED_LOCALES = ['zh-CN', 'en-US']

function resolveLocale() {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (saved && SUPPORTED_LOCALES.includes(saved)) {
    return saved
  }

  const browserLocale = navigator.language
  if (SUPPORTED_LOCALES.includes(browserLocale)) {
    return browserLocale
  }

  return 'zh-CN'
}

const messages = {
  'zh-CN': {
    common: {
      localeLabel: '中文',
      switchTo: 'EN',
    },
    auth: {
      logoSub: 'Natural Experience',
      loadingQuote: '正在加载一言...',
      fallbackQuote: '风起于青萍之末，浪成于微澜之间。',
      fallbackFrom: '一言',
      username: '用户名',
      password: '密码',
      loginTitle: '欢迎回来',
      loginButton: '登录',
      rememberPassword: '记住密码',
      createAccount: '创建新账号',
      loginMissingFields: '请输入用户名和密码',
      loginTokenMissing: '登录成功但未返回 token',
      loginPersistInfo: '本项目当前默认持久化 token，可后续扩展为会话态',
      loginSuccess: '登录成功，正在进入测试页面',
      loginFailed: '登录失败，请检查账号和密码',
      registerTitle: '创建账号',
      confirmPassword: '确认密码',
      registerButton: '创建账号',
      registerBackToLogin: '已有账号？返回登录',
      registerPasswordMismatch: '两次输入的密码不一致',
      registerSuccess: '创建账号成功，请返回登录',
      registerFailed: '创建账号失败，请稍后重试',
    },
  },
  'en-US': {
    common: {
      localeLabel: 'EN',
      switchTo: '中文',
    },
    auth: {
      logoSub: 'Natural Experience',
      loadingQuote: 'Loading quote...',
      fallbackQuote: 'Great winds rise from tiny ripples.',
      fallbackFrom: 'Hitokoto',
      username: 'Username',
      password: 'Password',
      loginTitle: 'Welcome Back',
      loginButton: 'LOGIN',
      rememberPassword: 'Remember me',
      createAccount: 'Create account',
      loginMissingFields: 'Please enter username and password',
      loginTokenMissing: 'Login succeeded but token is missing',
      loginPersistInfo: 'Token is persisted by default in this project',
      loginSuccess: 'Login successful, redirecting to API test page',
      loginFailed: 'Login failed, please check username and password',
      registerTitle: 'Create Account',
      confirmPassword: 'Confirm Password',
      registerButton: 'SIGN UP',
      registerBackToLogin: 'Already have an account? Back to login',
      registerPasswordMismatch: 'The passwords do not match',
      registerSuccess: 'Account created successfully, please login',
      registerFailed: 'Failed to create account, please try again later',
    },
  },
}

export const i18n = createI18n({
  legacy: false,
  locale: resolveLocale(),
  fallbackLocale: 'zh-CN',
  messages,
})

export function toggleLocale() {
  const nextLocale = i18n.global.locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
  i18n.global.locale.value = nextLocale
  localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale)
}
