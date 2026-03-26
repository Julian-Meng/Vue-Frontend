import { request } from '../request';

const ADMIN_PREFIX = '/api/admin';

// 获取部门列表。
export function getDepartmentList(token, params) {
    return request({
        url: `${ADMIN_PREFIX}/departments`,
        method: 'GET',
        token,
        params,
    });
}

// 根据部门 ID 获取详情。
export function getDepartmentById(token, id) {
    return request({
        url: `${ADMIN_PREFIX}/department/${id}`,
        method: 'GET',
        token,
    });
}

// 创建部门。
export function createDepartment(token, data) {
    return request({
        url: `${ADMIN_PREFIX}/department`,
        method: 'POST',
        token,
        data,
    });
}

// 更新部门。
export function updateDepartment(token, id, data) {
    return request({
        url: `${ADMIN_PREFIX}/department/${id}`,
        method: 'PUT',
        token,
        data,
    });
}

// 删除部门。
export function deleteDepartment(token, id) {
    return request({
        url: `${ADMIN_PREFIX}/department/${id}`,
        method: 'DELETE',
        token,
    });
}
