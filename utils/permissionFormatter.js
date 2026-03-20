function tryParseJsonFromText(text) {
  if (typeof text !== 'string') {
    return null
  }

  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }

  // 兼容后端测试文本：前面有 GET/Status，JSON 在最后一段。
  const firstBrace = trimmed.indexOf('{')
  const firstBracket = trimmed.indexOf('[')
  let start = -1

  if (firstBrace >= 0 && firstBracket >= 0) {
    start = Math.min(firstBrace, firstBracket)
  } else {
    start = Math.max(firstBrace, firstBracket)
  }

  if (start < 0) {
    return null
  }

  const jsonPart = trimmed.slice(start)

  try {
    return JSON.parse(jsonPart)
  } catch {
    return null
  }
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value > 0
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', 'allow', 'allowed', 'yes', 'y', '1', 'ok', 'enable', 'enabled'].includes(normalized)) {
      return true
    }
    if (['false', 'deny', 'denied', 'no', 'n', '0', 'forbid', 'forbidden', 'disable', 'disabled'].includes(normalized)) {
      return false
    }
  }

  return false
}

function normalizeAllowedRoles(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean)
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return []
}

function buildRowsFromPermissionArray(list) {
  return list.map((item, index) => {
    const path = item?.path || item?.api || item?.endpoint || ''
    const method = String(item?.method || item?.http_method || 'GET').toUpperCase()
    const key = item?.key || `${method}:${path || `item_${index + 1}`}`

    return {
      id: `${key}_${index}`,
      key,
      group: item?.group || item?.module || 'default',
      name: item?.name || item?.title || key,
      description: item?.description || '',
      method,
      path,
      allowedRoles: normalizeAllowedRoles(item?.allowed_roles || item?.roles),
      hasAccess: normalizeBoolean(item?.has_access ?? item?.allowed ?? item?.status),
      raw: item,
    }
  })
}

function buildRowsFromObjectMap(payload) {
  return Object.entries(payload).map(([api, value], index) => ({
    id: `${api}_${index}`,
    key: api,
    group: 'default',
    name: api,
    description: '',
    method: typeof value === 'object' && value?.method ? String(value.method).toUpperCase() : 'GET',
    path: typeof value === 'object' && value?.path ? value.path : api,
    allowedRoles: normalizeAllowedRoles(typeof value === 'object' ? value?.allowed_roles : []),
    hasAccess: normalizeBoolean(typeof value === 'object' ? (value?.has_access ?? value?.allowed ?? value?.status) : value),
    raw: value,
  }))
}

export function formatPermissionMatrix(input) {
  let payload = input

  if (typeof payload === 'string') {
    payload = tryParseJsonFromText(payload)
  }

  if (!payload || typeof payload !== 'object') {
    return {
      meta: { currentRole: '', currentUser: '', total: 0 },
      rows: [],
      rawPayload: payload,
    }
  }

  // 兼容 request.js 默认 unwrap=true 的情况：可能直接拿到 permissions[] 或其上层对象。
  const permissionList =
    Array.isArray(payload) ? payload :
      Array.isArray(payload.permissions) ? payload.permissions :
        Array.isArray(payload.items) ? payload.items : null

  const rows = permissionList
    ? buildRowsFromPermissionArray(permissionList)
    : buildRowsFromObjectMap(payload)

  return {
    meta: {
      currentRole: payload.current_role || payload.role || '',
      currentUser: payload.current_user || payload.username || '',
      total: rows.length,
    },
    rows,
    rawPayload: payload,
  }
}

export function prettyPermissionPayload(payload) {
  try {
    return JSON.stringify(payload, null, 2)
  } catch {
    return String(payload)
  }
}
