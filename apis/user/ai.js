import { request } from '../request'

const USER_PREFIX = '/api/user'

// 获取普通用户首页的 AI 分析结果。
export function analyzeUserDashboard(token, params) {
  return request({
    url: `${USER_PREFIX}/ai/analyze/dashboard`,
    method: 'GET',
    token,
    params,
  })
}