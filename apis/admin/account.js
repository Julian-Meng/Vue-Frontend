import { request } from '../request';

const ADMIN_PREFIX = '/api/admin';

// 获取账号列表。
export function getAccountList(token, params) {
    return request({
        url: `${ADMIN_PREFIX}/accounts`,
        method: 'GET',
        token,
        params,
    });
}

// 创建账号。
export function createAccount(token, data) {
    return request({
        url: `${ADMIN_PREFIX}/account`,
        method: 'POST',
        token,
        data,
    });
}

// 更新账号。
export function updateAccount(token, id, data) {
    return request({
        url: `${ADMIN_PREFIX}/account/${id}`,
        method: 'PUT',
        token,
        data,
    });
}

// 删除账号。
export function deleteAccount(token, id) {
    return request({
        url: `${ADMIN_PREFIX}/account/${id}`,
        method: 'DELETE',
        token,
    });
}
