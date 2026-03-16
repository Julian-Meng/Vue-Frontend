import { request } from '../request'

const USER_PREFIX = '/api/user'

// 获取指定用户资料。
export function getUserProfileById(token, id) {
  return request({
    url: `${USER_PREFIX}/profile/${id}`,
    method: 'GET',
    token,
  })
}

// 更新指定用户资料。
export function updateUserProfileById(token, id, data) {
  return request({
    url: `${USER_PREFIX}/profile/${id}`,
    method: 'PUT',
    token,
    data,
  })
}

// 获取当前登录用户自己的档案。
export function getMyProfile(token) {
  return request({
    url: `${USER_PREFIX}/profile`,
    method: 'GET',
    token,
  })
}