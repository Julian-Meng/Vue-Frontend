import { request } from '../request';

const USER_PREFIX = '/api/user';

// 获取普通用户仪表盘数据。
export function getUserDashboard(token) {
    return request({
        url: `${USER_PREFIX}/dashboard`,
        method: 'GET',
        token,
    });
}
