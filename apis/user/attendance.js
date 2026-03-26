import { request } from '../request';

const USER_PREFIX = '/api/user';

// 用户上班打卡。
export function checkIn(token, data) {
    return request({
        url: `${USER_PREFIX}/attendance/checkin`,
        method: 'POST',
        token,
        data,
    });
}

// 用户下班打卡。
export function checkOut(token, data) {
    return request({
        url: `${USER_PREFIX}/attendance/checkout`,
        method: 'POST',
        token,
        data,
    });
}

// 获取当前用户自己的考勤记录。
export function getMyAttendance(token, params) {
    return request({
        url: `${USER_PREFIX}/attendance/my`,
        method: 'GET',
        token,
        params,
    });
}
