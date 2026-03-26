import { request } from '../request';

const ADMIN_PREFIX = '/api/admin';

// 查询考勤记录，可附带筛选条件。
export function searchAttendance(token, params) {
    return request({
        url: `${ADMIN_PREFIX}/attendance`,
        method: 'GET',
        token,
        params,
    });
}

// 更新指定考勤记录。
export function updateAttendance(token, id, data) {
    return request({
        url: `${ADMIN_PREFIX}/attendance/${id}`,
        method: 'PUT',
        token,
        data,
    });
}

// 删除指定考勤记录。
export function deleteAttendance(token, id) {
    return request({
        url: `${ADMIN_PREFIX}/attendance/${id}`,
        method: 'DELETE',
        token,
    });
}
