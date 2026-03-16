import { request } from '../request'

const ADMIN_PREFIX = '/api/admin'

// 获取人事变更申请列表。
export function getPersonnelList(token, params) {
  return request({
    url: `${ADMIN_PREFIX}/changes`,
    method: 'GET',
    token,
    params,
  })
}

// 获取单条人事变更详情。
export function getPersonnelById(token, id) {
  return request({
    url: `${ADMIN_PREFIX}/change/${id}`,
    method: 'GET',
    token,
  })
}

// 新建人事变更申请。
export function createPersonnel(token, data) {
  return request({
    url: `${ADMIN_PREFIX}/change`,
    method: 'POST',
    token,
    data,
  })
}

// 审批人事变更申请。
export function approvePersonnel(token, data) {
  return request({
    url: `${ADMIN_PREFIX}/change/approve`,
    method: 'PUT',
    token,
    data,
  })
}