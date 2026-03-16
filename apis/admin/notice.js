import { request } from '../request'

const ADMIN_PREFIX = '/api/admin'

// 创建公告。
export function createNotice(token, data) {
  return request({
    url: `${ADMIN_PREFIX}/notice`,
    method: 'POST',
    token,
    data,
  })
}

// 更新公告。
export function updateNotice(token, id, data) {
  return request({
    url: `${ADMIN_PREFIX}/notice/${id}`,
    method: 'PUT',
    token,
    data,
  })
}

// 删除公告。
export function deleteNotice(token, id) {
  return request({
    url: `${ADMIN_PREFIX}/notice/${id}`,
    method: 'DELETE',
    token,
  })
}

// 获取公告详情。
export function getNoticeById(token, id) {
  return request({
    url: `${ADMIN_PREFIX}/notice/${id}`,
    method: 'GET',
    token,
  })
}