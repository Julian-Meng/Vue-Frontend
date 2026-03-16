import { request } from '../request'

const ADMIN_PREFIX = '/api/admin'

// 获取员工列表，可传入筛选条件。
export function getPersonList(token, params) {
  return request({
    url: `${ADMIN_PREFIX}/persons`,
    method: 'GET',
    token,
    params,
  })
}

// 创建员工。
export function createPerson(token, data) {
  return request({
    url: `${ADMIN_PREFIX}/person`,
    method: 'POST',
    token,
    data,
  })
}

// 根据主键 ID 获取员工详情。
export function getPersonById(token, id) {
  return request({
    url: `${ADMIN_PREFIX}/person/${id}`,
    method: 'GET',
    token,
  })
}

// 根据主键 ID 更新员工信息。
export function updatePerson(token, id, data) {
  return request({
    url: `${ADMIN_PREFIX}/person/${id}`,
    method: 'PUT',
    token,
    data,
  })
}

// 根据主键 ID 删除员工。
export function deletePersonById(token, id) {
  return request({
    url: `${ADMIN_PREFIX}/person/${id}`,
    method: 'DELETE',
    token,
  })
}

// 根据工号删除员工。
export function deletePersonByEmpId(token, empId) {
  return request({
    url: `${ADMIN_PREFIX}/person/emp/${empId}`,
    method: 'DELETE',
    token,
  })
}

// 调整员工岗位。
export function changePersonJob(token, data) {
  return request({
    url: `${ADMIN_PREFIX}/person/job`,
    method: 'PUT',
    token,
    data,
  })
}

// 调整员工状态。
export function changePersonState(token, data) {
  return request({
    url: `${ADMIN_PREFIX}/person/state`,
    method: 'PUT',
    token,
    data,
  })
}

// 调整员工所属部门。
export function changePersonDepartment(token, data) {
  return request({
    url: `${ADMIN_PREFIX}/person/change-dept`,
    method: 'PUT',
    token,
    data,
  })
}