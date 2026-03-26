import { request } from '../request';

const ADMIN_PREFIX = '/api/admin';

// 按员工工号获取完整个人档案。
export function getPersonProfile(token, empId) {
    return request({
        url: `${ADMIN_PREFIX}/person/profile/${empId}`,
        method: 'GET',
        token,
    });
}
