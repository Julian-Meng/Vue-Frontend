import { request } from '../request';

const USER_PREFIX = '/api/user';

// 提交人事变更申请。
export function createChangeRequest(token, data) {
    return request({
        url: `${USER_PREFIX}/change/request`,
        method: 'POST',
        token,
        data,
    });
}

// 获取当前登录用户的人事变更申请列表。
export function getMyChangeList(token, params) {
    return request({
        url: `${USER_PREFIX}/changes`,
        method: 'GET',
        token,
        params,
    });
}

// 获取当前登录用户的人事变更申请详情。
export function getMyChangeById(token, id) {
    return request({
        url: `${USER_PREFIX}/change/${id}`,
        method: 'GET',
        token,
    });
}
