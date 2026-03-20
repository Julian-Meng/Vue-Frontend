import { request } from '../request'

const USER_PREFIX = '/api/user'

// 获取当前用户的权限矩阵。
// 该接口返回结构包含 code/msg/permissions，非 data 包裹，需关闭默认 unwrap。
export function getPermissions(token) {
  return request({
    url: `${USER_PREFIX}/permissions`,
    method: 'GET',
    token,
    unwrap: false,
  })
}