import { request } from '../request';

const ADMIN_PREFIX = '/api/admin';
const CHAT_PREFIX = '/api/chat';

// 获取管理员首页的 AI 分析结果。
export function analyzeAdminDashboard(token, params) {
    return request({
        url: `${ADMIN_PREFIX}/ai/analyze/dashboard`,
        method: 'GET',
        token,
        params,
    });
}

// 获取管理员会话列表。
export function getAdminChatSessions(token, params) {
    return request({
        url: `${CHAT_PREFIX}/admin/sessions`,
        method: 'GET',
        token,
        params,
    });
}

// 管理员发送消息。
export function sendAdminChatMessage(token, data) {
    return request({
        url: `${CHAT_PREFIX}/admin/message`,
        method: 'POST',
        token,
        data,
    });
}

// 批量认领等待会话。
export function claimWaitingChatSessions(token, data) {
    return request({
        url: `${CHAT_PREFIX}/admin/sessions/claim`,
        method: 'POST',
        token,
        data,
    });
}

// 接管指定会话。
export function claimChatSessionById(token, sessionId, data) {
    return request({
        url: `${CHAT_PREFIX}/admin/sessions/${sessionId}/claim`,
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
