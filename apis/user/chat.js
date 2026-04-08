import { request } from '../request';

const USER_PREFIX = '/api/user';
const CHAT_PREFIX = '/api/chat';

// 获取普通用户首页的 AI 分析结果。
export function analyzeUserDashboard(token, params) {
    return request({
        url: `${USER_PREFIX}/ai/analyze/dashboard`,
        method: 'GET',
        token,
        params,
    });
}

// 获取用户侧会话列表。
export function getUserChatSessions(token, params) {
    return request({
        url: `${CHAT_PREFIX}/user/sessions`,
        method: 'GET',
        token,
        params,
    });
}

// 用户发送聊天消息。
export function sendUserChatMessage(token, data) {
    return request({
        url: `${CHAT_PREFIX}/user/message`,
        method: 'POST',
        token,
        data,
    });
}

// 获取会话历史消息。
export function getChatMessages(token, sessionId, params) {
    return request({
        url: `${CHAT_PREFIX}/messages/${sessionId}`,
        method: 'GET',
        token,
        params,
    });
}
