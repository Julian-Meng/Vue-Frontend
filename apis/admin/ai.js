import { request } from '../request'

const ADMIN_PREFIX = '/api/admin'

// 获取管理员首页的 AI 分析结果。
export function analyzeAdminDashboard(token, params) {
  return request({
    url: `${ADMIN_PREFIX}/ai/analyze/dashboard`,
    method: 'GET',
    token,
    params,
  })
}