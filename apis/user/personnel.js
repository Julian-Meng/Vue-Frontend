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
