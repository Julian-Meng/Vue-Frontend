import { request } from '../request'

const USER_PREFIX = '/api/user'

// 获取当前用户的权限矩阵。
export function getPermissions(token) {
  return request({
    url: `${USER_PREFIX}/permissions`,
    method: 'GET',
    token,
  })
}