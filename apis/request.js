// 统一请求封装。
// 默认读取 Vite 环境变量 VITE_API_BASE_URL，未配置时走同源代理。
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

// 默认 token 存储键。
// 同时兼容历史常见键名，避免切换请求层后用户需要手动清缓存重新登录。
const DEFAULT_TOKEN_STORAGE_KEY = 'auth_token'
const LEGACY_TOKEN_STORAGE_KEYS = ['token', 'access_token']

let tokenStorageKey = DEFAULT_TOKEN_STORAGE_KEY
let tokenResolver = null

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeToken(token) {
  return typeof token === 'string' ? token.trim() : ''
}

function getTokenByStorageKey(storageKey) {
  if (!canUseLocalStorage()) {
    return ''
  }

  return normalizeToken(window.localStorage.getItem(storageKey))
}

function createRequestError(message, extra = {}) {
  const error = new Error(message)
  Object.assign(error, extra)
  return error
}

// 自定义 token 存储键，便于接入现有项目的本地存储规范。
export function setTokenStorageKey(storageKey) {
  const normalizedKey = normalizeToken(storageKey)

  if (normalizedKey) {
    tokenStorageKey = normalizedKey
  }
}

// 注册外部 token 解析器。
// 典型用法是在 Pinia store 初始化后，把 store 里的 token 暴露给请求层。
export function setTokenResolver(resolver) {
  tokenResolver = typeof resolver === 'function' ? resolver : null
}

// 清理外部注册的 token 解析器。
export function clearTokenResolver() {
  tokenResolver = null
}

// 从 localStorage 中读取 token。
// 优先读取当前配置键名，再兼容旧键名。
export function getStoredToken() {
  const candidateKeys = [tokenStorageKey, ...LEGACY_TOKEN_STORAGE_KEYS].filter(
    (key, index, keys) => keys.indexOf(key) === index,
  )

  for (const storageKey of candidateKeys) {
    const storedToken = getTokenByStorageKey(storageKey)

    if (storedToken) {
      return storedToken
    }
  }

  return ''
}

// 将 token 持久化到 localStorage，便于刷新后保留登录态。
export function saveAuthToken(token) {
  if (!canUseLocalStorage()) {
    return
  }

  const normalizedToken = normalizeToken(token)

  if (!normalizedToken) {
    window.localStorage.removeItem(tokenStorageKey)
    return
  }

  window.localStorage.setItem(tokenStorageKey, normalizedToken)
}

// 清理已持久化的 token。
export function clearAuthToken() {
  if (!canUseLocalStorage()) {
    return
  }

  const candidateKeys = [tokenStorageKey, ...LEGACY_TOKEN_STORAGE_KEYS].filter(
    (key, index, keys) => keys.indexOf(key) === index,
  )

  candidateKeys.forEach((storageKey) => {
    window.localStorage.removeItem(storageKey)
  })
}

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          searchParams.append(key, String(item))
        }
      })
      return
    }

    searchParams.append(key, String(value))
  })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

function buildRequestUrl(url, params) {
  return `${API_BASE_URL}${url}${buildQueryString(params)}`
}

function resolveAuthToken(explicitToken) {
  const normalizedExplicitToken = normalizeToken(explicitToken)

  if (normalizedExplicitToken) {
    return normalizedExplicitToken
  }

  if (typeof tokenResolver === 'function') {
    const resolvedToken = normalizeToken(tokenResolver())

    if (resolvedToken) {
      return resolvedToken
    }
  }

  return getStoredToken()
}

function isStandardApiPayload(payload) {
  return typeof payload === 'object' && payload !== null && 'code' in payload && 'msg' in payload
}

async function parseResponse(response, { unwrap = true } = {}) {
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const errorMessage =
      typeof payload === 'object' && payload !== null
        ? payload.msg || payload.message || payload.error || `Request failed with status ${response.status}`
        : payload || `Request failed with status ${response.status}`

    throw createRequestError(errorMessage, {
      status: response.status,
      payload,
    })
  }

  // 后端统一返回 { code, msg, data }，这里直接做业务态解析。
  // 页面层只需要处理成功数据或捕获错误，不必在每个接口处重复判断 code。
  if (isStandardApiPayload(payload)) {
    if (payload.code !== 0) {
      throw createRequestError(payload.msg || 'Request failed', {
        status: response.status,
        businessCode: payload.code,
        payload,
      })
    }

    return unwrap ? payload.data : payload
  }

  return payload
}

export async function request({
  url,
  method = 'GET',
  params,
  data,
  token,
  withAuth = true,
  unwrap = true,
  headers = {},
} = {}) {
  const requestHeaders = { ...headers }
  const requestOptions = {
    method,
    headers: requestHeaders,
  }

  if (withAuth) {
    const resolvedToken = resolveAuthToken(token)

    if (resolvedToken) {
      requestHeaders.Authorization = `Bearer ${resolvedToken}`
    }
  }

  if (data !== undefined) {
    const isFormData = data instanceof FormData

    if (isFormData) {
      requestOptions.body = data
    } else {
      requestHeaders['Content-Type'] = 'application/json'
      requestOptions.body = JSON.stringify(data)
    }
  }

  const response = await fetch(buildRequestUrl(url, params), requestOptions)
  return parseResponse(response, { unwrap })
}

export const apiBaseUrl = API_BASE_URL