import { request } from '../request'

const ADMIN_PREFIX = '/api/admin'

// 获取管理员仪表盘汇总数据。
export function getAdminDashboard(token) {
  return request({
    url: `${ADMIN_PREFIX}/dashboard`,
    method: 'GET',
    token,
  })
}