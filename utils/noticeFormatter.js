function toSafeText(value) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).trim()
}

function pickFirstValue(source, keys) {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null && source[key] !== '') {
      return source[key]
    }
  }
  return ''
}

function formatDateTime(input, locale = 'zh-CN') {
  if (!input) {
    return ''
  }

  const date = new Date(input)
  if (Number.isNaN(date.getTime())) {
    return toSafeText(input)
  }

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function buildSummary(content, maxLength = 80) {
  const text = toSafeText(content)
  if (!text) {
    return ''
  }

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trimEnd()}...`
}

export function formatNoticeForDashboard(rawNotice, options = {}) {
  const locale = options.locale || 'zh-CN'
  const maxContentLength = Number.isFinite(options.maxContentLength) ? options.maxContentLength : 80

  const id = pickFirstValue(rawNotice, ['id', 'notice_id', 'noticeId'])
  const title =
    toSafeText(pickFirstValue(rawNotice, ['title', 'notice_title', 'name'])) ||
    (locale === 'zh-CN' ? '未命名公告' : 'Untitled Notice')
  const content = toSafeText(pickFirstValue(rawNotice, ['content', 'body', 'notice_content']))
  const publisher = toSafeText(pickFirstValue(rawNotice, ['publisher', 'author', 'created_by']))
  const createdAtRaw = pickFirstValue(rawNotice, ['created_at', 'create_time', 'createdAt', 'time'])

  return {
    id,
    title,
    content,
    summary: buildSummary(content, maxContentLength),
    publisher,
    createdAtRaw,
    createdAtText: formatDateTime(createdAtRaw, locale),
  }
}

export function formatNoticeListForDashboard(rawList, options = {}) {
  const list = Array.isArray(rawList) ? rawList : []
  const limit = Number.isFinite(options.limit) ? Math.max(options.limit, 0) : list.length

  return list.slice(0, limit).map((item) => formatNoticeForDashboard(item, options))
}
