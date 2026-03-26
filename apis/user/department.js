import { request } from '../request';

const USER_PREFIX = '/api/user';

// 获取部门详情。
export function getDepartmentById(token, id) {
    return request({
        url: `${USER_PREFIX}/department/${id}`,
        method: 'GET',
        token,
    });
}
