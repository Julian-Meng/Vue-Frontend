<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { adminApi, userApi } from '../../../apis';
import { useAuthStore } from '../../../src/stores/auth';

const props = defineProps({
    role: { type: String, default: 'user' },
});

const { t } = useI18n();
const authStore = useAuthStore();

const loadingSessions = ref(false);
const loadingMessages = ref(false);
const sending = ref(false);
const claimingWaiting = ref(false);
const claimingCurrent = ref(false);
const error = ref('');

const sessions = ref([]);
const activeSessionId = ref(null);
const messages = ref([]);
const messageInput = ref('');

const wsState = ref('disconnected');
const reconnectAttempt = ref(0);

let socket = null;
let reconnectTimer = null;
let pollingTimer = null;
let manualDisconnect = false;

const isAdmin = computed(() => ['admin', 'superadmin'].includes(String(props.role).toLowerCase()));

const activeSession = computed(() => {
    if (!activeSessionId.value) {
        return null;
    }

    return sessions.value.find((item) => String(item.id) === String(activeSessionId.value)) || null;
});

const wsStateText = computed(() => {
    if (wsState.value === 'connected') {
        return t('dashboard.ai.wsConnected');
    }
    if (wsState.value === 'connecting') {
        return t('dashboard.ai.wsConnecting');
    }
    if (wsState.value === 'reconnecting') {
        return t('dashboard.ai.wsReconnecting');
    }
    return t('dashboard.ai.wsDisconnected');
});

function normalizeSession(raw = {}) {
    return {
        id: raw.id ?? raw.session_id ?? raw.sid ?? null,
        userEmpId: raw.user_emp_id ?? raw.userEmpId ?? '-',
        assignedAdminEmpId: raw.assigned_admin_emp_id ?? raw.assignedAdminEmpId ?? '',
        status: raw.status ?? 'open',
        source: raw.source ?? 'human',
        lastMessageAt:
            raw.last_message_at ?? raw.lastMessageAt ?? raw.update_at ?? raw.updateAt ?? '',
    };
}

function normalizeMessage(raw = {}, fallbackSessionId = null) {
    const senderType = raw.sender_type ?? raw.senderType ?? raw.sender ?? 'system';

    return {
        id: raw.id ?? raw.message_id ?? `${Date.now()}-${Math.random()}`,
        sessionId: raw.session_id ?? raw.sessionId ?? fallbackSessionId,
        content: raw.content ?? raw.message ?? '',
        senderType,
        aiFlag: Boolean(raw.ai_flag || raw.aiFlag || senderType === 'ai'),
        aiNotice: raw.ai_notice ?? raw.aiNotice ?? '',
        createAt: raw.create_at ?? raw.created_at ?? raw.createAt ?? raw.sent_at ?? '',
    };
}

function pickArray(payload, fieldName) {
    if (Array.isArray(payload)) {
        return payload;
    }
    if (Array.isArray(payload?.[fieldName])) {
        return payload[fieldName];
    }
    if (Array.isArray(payload?.list)) {
        return payload.list;
    }
    return [];
}

function sortSessionsByLatest() {
    sessions.value.sort((a, b) => {
        const aTime = new Date(a.lastMessageAt || 0).getTime();
        const bTime = new Date(b.lastMessageAt || 0).getTime();
        return bTime - aTime;
    });
}

function upsertSession(raw) {
    const session = normalizeSession(raw);
    if (!session.id) {
        return;
    }

    const index = sessions.value.findIndex((item) => String(item.id) === String(session.id));
    if (index >= 0) {
        sessions.value[index] = {
            ...sessions.value[index],
            ...session,
        };
    } else {
        sessions.value.unshift(session);
    }

    sortSessionsByLatest();
}

function formatDateTime(value) {
    if (!value) {
        return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString();
}

function sessionStatusText(status) {
    if (status === 'waiting_admin') {
        return t('dashboard.ai.statusWaitingAdmin');
    }
    if (status === 'closed') {
        return t('dashboard.ai.statusClosed');
    }
    return t('dashboard.ai.statusOpen');
}

function sourceHasAI(source) {
    return source === 'ai_fallback' || source === 'mixed';
}

function messageRoleText(type) {
    if (type === 'user') {
        return t('dashboard.ai.senderUser');
    }
    if (type === 'admin') {
        return t('dashboard.ai.senderAdmin');
    }
    if (type === 'ai') {
        return t('dashboard.ai.senderAI');
    }
    return t('dashboard.ai.senderSystem');
}

function messageRowClass(message) {
    if (message.senderType === 'user') {
        return 'msg-row from-user';
    }
    if (message.senderType === 'admin') {
        return 'msg-row from-admin';
    }
    if (message.senderType === 'ai') {
        return 'msg-row from-ai';
    }
    return 'msg-row from-system';
}

function appendMessage(raw, fallbackSessionId = null) {
    const nextMessage = normalizeMessage(raw, fallbackSessionId);
    if (!nextMessage.sessionId || String(nextMessage.sessionId) !== String(activeSessionId.value)) {
        return;
    }

    const duplicated = messages.value.some((item) => String(item.id) === String(nextMessage.id));
    if (!duplicated) {
        messages.value.push(nextMessage);
    }
}

async function loadMessages(sessionId) {
    if (!sessionId) {
        messages.value = [];
        return;
    }

    loadingMessages.value = true;
    try {
        const payload = isAdmin.value
            ? await adminApi.getChatMessages(undefined, sessionId)
            : await userApi.getChatMessages(undefined, sessionId);

        messages.value = pickArray(payload, 'messages').map((item) =>
            normalizeMessage(item, sessionId)
        );
    } catch (e) {
        messages.value = [];
        ElMessage.error(e?.message || t('dashboard.ai.loadMessagesFailed'));
    } finally {
        loadingMessages.value = false;
    }
}

async function loadSessions({ keepActive = true } = {}) {
    loadingSessions.value = true;
    error.value = '';

    try {
        const payload = isAdmin.value
            ? await adminApi.getAdminChatSessions()
            : await userApi.getUserChatSessions();

        sessions.value = pickArray(payload, 'sessions')
            .map(normalizeSession)
            .filter((item) => item.id);
        sortSessionsByLatest();

        if (sessions.value.length === 0) {
            activeSessionId.value = null;
            messages.value = [];
            return;
        }

        const stillExists =
            keepActive &&
            activeSessionId.value &&
            sessions.value.some((item) => String(item.id) === String(activeSessionId.value));

        if (!stillExists) {
            activeSessionId.value = sessions.value[0].id;
        }

        await loadMessages(activeSessionId.value);
    } catch (e) {
        error.value = e?.message || t('dashboard.ai.loadSessionsFailed');
        sessions.value = [];
        activeSessionId.value = null;
        messages.value = [];
    } finally {
        loadingSessions.value = false;
    }
}

async function sendMessage() {
    const content = messageInput.value.trim();
    if (!content) {
        return;
    }

    if (isAdmin.value && !activeSessionId.value) {
        ElMessage.warning(t('dashboard.ai.selectSessionFirst'));
        return;
    }

    sending.value = true;

    try {
        const payload = isAdmin.value
            ? await adminApi.sendAdminChatMessage(undefined, {
                  session_id: activeSessionId.value,
                  content,
              })
            : await userApi.sendUserChatMessage(undefined, {
                  session_id: activeSessionId.value || undefined,
                  content,
              });

        if (payload?.session) {
            upsertSession(payload.session);
            activeSessionId.value = normalizeSession(payload.session).id;
        }

        if (payload?.session_id) {
            activeSessionId.value = payload.session_id;
            upsertSession({
                id: payload.session_id,
                status: activeSession.value?.status || 'open',
                source: activeSession.value?.source || 'human',
                last_message_at: new Date().toISOString(),
            });
        }

        if (payload?.message) {
            appendMessage(payload.message, activeSessionId.value);
        } else {
            appendMessage(
                {
                    id: `${Date.now()}-local`,
                    session_id: activeSessionId.value,
                    sender_type: isAdmin.value ? 'admin' : 'user',
                    content,
                    create_at: new Date().toISOString(),
                },
                activeSessionId.value
            );
        }

        if (payload?.ai_message) {
            if (typeof payload.ai_message === 'string') {
                appendMessage(
                    {
                        id: `${Date.now()}-ai`,
                        session_id: activeSessionId.value,
                        sender_type: 'ai',
                        ai_flag: true,
                        content: payload.ai_message,
                        ai_notice: payload.ai_notice || '',
                        create_at: new Date().toISOString(),
                    },
                    activeSessionId.value
                );
            } else {
                appendMessage(payload.ai_message, activeSessionId.value);
            }
        }

        messageInput.value = '';
        await loadSessions();
    } catch (e) {
        ElMessage.error(e?.message || t('dashboard.ai.sendFailed'));
    } finally {
        sending.value = false;
    }
}

async function claimWaitingSessions() {
    claimingWaiting.value = true;
    try {
        await adminApi.claimWaitingChatSessions(undefined, { limit: 10 });
        ElMessage.success(t('dashboard.ai.claimWaitingSuccess'));
        await loadSessions();
    } catch (e) {
        ElMessage.error(e?.message || t('dashboard.ai.claimWaitingFailed'));
    } finally {
        claimingWaiting.value = false;
    }
}

async function claimCurrentSession() {
    if (!activeSessionId.value) {
        ElMessage.warning(t('dashboard.ai.selectSessionFirst'));
        return;
    }

    claimingCurrent.value = true;
    try {
        await adminApi.claimChatSessionById(undefined, activeSessionId.value, {});
        ElMessage.success(t('dashboard.ai.claimCurrentSuccess'));
        await loadSessions();
    } catch (e) {
        ElMessage.error(e?.message || t('dashboard.ai.claimCurrentFailed'));
    } finally {
        claimingCurrent.value = false;
    }
}

function buildWsUrl() {
    const token = authStore.token;
    if (!token) {
        return '';
    }

    const configuredBase = import.meta.env.VITE_API_BASE_URL || '';
    if (configuredBase) {
        try {
            const parsed = new URL(configuredBase, window.location.origin);
            const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
            return `${protocol}//${parsed.host}/api/chat/ws?token=${encodeURIComponent(token)}`;
        } catch {
            // ignore and fallback to current origin
        }
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/chat/ws?token=${encodeURIComponent(token)}`;
}

function clearReconnectTimer() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
}

function stopPolling() {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
    }
}

function startPolling() {
    if (pollingTimer || wsState.value === 'connected') {
        return;
    }

    pollingTimer = setInterval(async () => {
        await loadSessions();
    }, 8000);
}

function scheduleReconnect() {
    if (manualDisconnect || document.hidden) {
        return;
    }

    reconnectAttempt.value += 1;
    const delay = Math.min(30000, Math.pow(2, reconnectAttempt.value - 1) * 1000);
    clearReconnectTimer();

    reconnectTimer = setTimeout(() => {
        connectWs(true);
    }, delay);
}

async function handleWsPayload(rawMessage) {
    let payload = null;
    try {
        payload = JSON.parse(rawMessage);
    } catch {
        return;
    }

    if (payload?.type === 'message') {
        const sessionId = payload.session_id || payload?.message?.session_id;

        if (payload.message) {
            appendMessage(payload.message, sessionId);
        }

        if (sessionId) {
            upsertSession({
                id: sessionId,
                last_message_at: payload.sent_at || new Date().toISOString(),
            });
        }
    }

    if (payload?.type === 'session_claimed' && isAdmin.value) {
        ElMessage.info(t('dashboard.ai.sessionClaimedNotice'));
        await loadSessions();
    }
}

function connectWs(isReconnect = false) {
    if (manualDisconnect) {
        return;
    }

    const wsUrl = buildWsUrl();
    if (!wsUrl) {
        return;
    }

    if (
        socket &&
        (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
    ) {
        return;
    }

    wsState.value = isReconnect ? 'reconnecting' : 'connecting';
    clearReconnectTimer();

    try {
        socket = new WebSocket(wsUrl);
    } catch {
        wsState.value = 'disconnected';
        startPolling();
        scheduleReconnect();
        return;
    }

    socket.onopen = () => {
        wsState.value = 'connected';
        reconnectAttempt.value = 0;
        stopPolling();
    };

    socket.onmessage = (event) => {
        handleWsPayload(event.data);
    };

    socket.onclose = () => {
        socket = null;
        if (manualDisconnect) {
            wsState.value = 'disconnected';
            return;
        }

        wsState.value = 'disconnected';
        startPolling();
        scheduleReconnect();
    };

    socket.onerror = () => {
        wsState.value = 'disconnected';
    };
}

function disconnectWs() {
    manualDisconnect = true;
    clearReconnectTimer();
    stopPolling();

    if (socket) {
        socket.close();
        socket = null;
    }

    wsState.value = 'disconnected';
}

function handleVisibilityChange() {
    if (document.hidden) {
        clearReconnectTimer();
        return;
    }

    if (wsState.value !== 'connected') {
        connectWs(true);
    }
}

watch(activeSessionId, (sessionId) => {
    if (sessionId) {
        loadMessages(sessionId);
    }
});

onMounted(async () => {
    await loadSessions({ keepActive: false });
    manualDisconnect = false;
    connectWs(false);
    document.addEventListener('visibilitychange', handleVisibilityChange);
});

onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    disconnectWs();
});
</script>

<template>
    <div class="panel">
        <div class="panel-header">
            <div>
                <h2 class="panel-title">{{ t('dashboard.nav.chat') }}</h2>
                <p class="panel-sub">
                    {{ isAdmin ? t('dashboard.ai.adminSub') : t('dashboard.ai.userSub') }}
                </p>
            </div>
            <div class="ws-state" :class="wsState">{{ wsStateText }}</div>
        </div>

        <div class="toolbar chat-toolbar">
            <button class="btn btn-secondary" :disabled="loadingSessions" @click="loadSessions()">
                {{ t('dashboard.ai.refreshSessions') }}
            </button>
            <button
                v-if="isAdmin"
                class="btn btn-primary"
                :disabled="claimingWaiting || loadingSessions"
                @click="claimWaitingSessions"
            >
                {{ claimingWaiting ? t('dashboard.ai.claiming') : t('dashboard.ai.claimWaiting') }}
            </button>
            <span v-if="wsState !== 'connected'" class="text-muted">
                {{ t('dashboard.ai.wsFallbackHint') }}
            </span>
        </div>

        <div class="chat-layout" :class="{ admin: isAdmin }">
            <aside v-if="isAdmin" class="session-pane fade-in">
                <h3 class="session-title">{{ t('dashboard.ai.sessionsTitle') }}</h3>
                <div v-if="loadingSessions" class="tip">{{ t('dashboard.loading') }}</div>
                <div v-else-if="error" class="tip error">{{ error }}</div>
                <div v-else-if="sessions.length === 0" class="tip">
                    {{ t('dashboard.ai.emptySessions') }}
                </div>
                <div v-else class="session-list">
                    <button
                        v-for="session in sessions"
                        :key="session.id"
                        class="session-item"
                        :class="{ active: String(session.id) === String(activeSessionId) }"
                        @click="activeSessionId = session.id"
                    >
                        <div class="session-top">
                            <span class="session-id">#{{ session.id }}</span>
                            <span class="status-badge" :class="session.status">
                                {{ sessionStatusText(session.status) }}
                            </span>
                        </div>
                        <div class="session-meta">
                            <span>{{ t('dashboard.ai.userEmp') }}: {{ session.userEmpId }}</span>
                            <span>
                                {{ t('dashboard.ai.assignedAdmin') }}:
                                {{ session.assignedAdminEmpId || t('dashboard.ai.unassigned') }}
                            </span>
                            <span>{{ formatDateTime(session.lastMessageAt) }}</span>
                        </div>
                        <div class="session-tags">
                            <span v-if="sourceHasAI(session.source)" class="badge source-tag">
                                {{ t('dashboard.ai.containsAI') }}
                            </span>
                        </div>
                    </button>
                </div>
            </aside>

            <section class="chat-pane fade-in">
                <div class="chat-pane-header">
                    <div>
                        <strong v-if="activeSession"
                            >{{ t('dashboard.ai.currentSession') }} #{{ activeSession.id }}</strong
                        >
                        <strong v-else>{{ t('dashboard.ai.noActiveSession') }}</strong>
                        <p class="chat-hint" v-if="activeSession">
                            {{ t('dashboard.ai.sessionStatus') }}:
                            {{ sessionStatusText(activeSession.status) }}
                        </p>
                    </div>
                    <button
                        v-if="isAdmin"
                        class="btn btn-ghost"
                        :disabled="!activeSession || claimingCurrent"
                        @click="claimCurrentSession"
                    >
                        {{
                            claimingCurrent
                                ? t('dashboard.ai.claiming')
                                : t('dashboard.ai.claimCurrent')
                        }}
                    </button>
                </div>

                <div class="message-scroller">
                    <div v-if="loadingMessages" class="tip">{{ t('dashboard.loading') }}</div>
                    <div v-else-if="!activeSession" class="tip">
                        {{ t('dashboard.ai.emptySessions') }}
                    </div>
                    <div v-else-if="messages.length === 0" class="tip">
                        {{ t('dashboard.ai.emptyMessages') }}
                    </div>
                    <div v-else class="message-list">
                        <article
                            v-for="message in messages"
                            :key="message.id"
                            class="msg-row"
                            :class="messageRowClass(message)"
                        >
                            <div class="msg-bubble">
                                <div class="msg-meta">
                                    <span>{{ messageRoleText(message.senderType) }}</span>
                                    <span>{{ formatDateTime(message.createAt) }}</span>
                                </div>
                                <p class="msg-content">{{ message.content }}</p>
                                <div
                                    v-if="message.senderType === 'ai' || message.aiFlag"
                                    class="msg-tags"
                                >
                                    <span class="badge source-tag">{{
                                        t('dashboard.ai.autoReply')
                                    }}</span>
                                </div>
                                <p v-if="message.aiNotice" class="msg-notice">
                                    {{ message.aiNotice }}
                                </p>
                            </div>
                        </article>
                    </div>
                </div>

                <div class="composer">
                    <textarea
                        v-model="messageInput"
                        class="input composer-input"
                        :placeholder="t('dashboard.ai.inputPlaceholder')"
                        rows="3"
                        @keydown.enter.exact.prevent="sendMessage"
                    />
                    <div class="composer-actions">
                        <span class="text-muted">{{ t('dashboard.ai.enterToSendHint') }}</span>
                        <button
                            class="btn btn-primary"
                            :disabled="sending || !messageInput.trim()"
                            @click="sendMessage"
                        >
                            {{ sending ? t('dashboard.ai.sending') : t('dashboard.ai.send') }}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>

<style scoped>
@import '../../styles/panel-common.css';
@import '../../styles/dashboard-pages.css';

.chat-toolbar {
    margin-bottom: 12px;
}

.ws-state {
    font-size: 12px;
    border: 1px solid #cbd5e1;
    color: #475569;
    background: #f8fafc;
    border-radius: 999px;
    padding: 4px 10px;
    line-height: 1;
    white-space: nowrap;
}

.ws-state.connected {
    background: #dcfce7;
    color: #166534;
    border-color: #86efac;
}

.ws-state.reconnecting,
.ws-state.connecting {
    background: #fef9c3;
    color: #854d0e;
    border-color: #fde68a;
}

.ws-state.disconnected {
    background: #fee2e2;
    color: #b91c1c;
    border-color: #fecaca;
}

.chat-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    min-height: 620px;
}

.chat-layout.admin {
    grid-template-columns: 320px 1fr;
}

.session-pane,
.chat-pane {
    background: var(--color-white);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-sm);
}

.session-pane {
    padding: 14px;
    display: flex;
    flex-direction: column;
    min-height: 620px;
}

.session-title {
    margin: 0 0 12px;
    font-size: 15px;
    color: #1e293b;
}

.session-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
    max-height: 560px;
    padding-right: 2px;
}

.session-item {
    text-align: left;
    border: 1px solid #e2e8f0;
    background: #fff;
    border-radius: 10px;
    padding: 10px;
    cursor: pointer;
    transition: var(--transition-fast);
}

.session-item:hover {
    border-color: #93c5fd;
    background: #f8fbff;
}

.session-item.active {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.session-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
}

.session-id {
    font-weight: 700;
    color: #0f172a;
}

.session-meta {
    display: grid;
    gap: 3px;
    color: #64748b;
    font-size: 12px;
}

.session-tags {
    margin-top: 8px;
    display: flex;
    gap: 6px;
}

.source-tag {
    background: #e0e7ff;
    color: #3730a3;
}

.chat-pane {
    display: flex;
    flex-direction: column;
    min-height: 620px;
}

.chat-pane-header {
    border-bottom: 1px solid var(--color-border-light);
    padding: 14px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.chat-hint {
    margin: 6px 0 0;
    font-size: 12px;
    color: #64748b;
}

.message-scroller {
    flex: 1;
    min-height: 320px;
    max-height: 470px;
    overflow-y: auto;
    padding: 16px;
    background: #f8fafc;
}

.message-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.msg-row {
    display: flex;
}

.msg-row.from-user {
    justify-content: flex-end;
}

.msg-row.from-admin,
.msg-row.from-ai {
    justify-content: flex-start;
}

.msg-row.from-system {
    justify-content: center;
}

.msg-bubble {
    width: min(75%, 620px);
    border-radius: 12px;
    border: 1px solid #dbeafe;
    background: #dbeafe;
    padding: 10px 12px;
}

.from-admin .msg-bubble {
    border-color: #e2e8f0;
    background: #ffffff;
}

.from-ai .msg-bubble {
    border-color: #fde68a;
    background: #fef9c3;
}

.from-system .msg-bubble {
    border-color: #e2e8f0;
    background: #f8fafc;
}

.msg-meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #64748b;
    gap: 10px;
    margin-bottom: 6px;
}

.msg-content {
    margin: 0;
    color: #1e293b;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
}

.msg-tags {
    margin-top: 8px;
    display: flex;
    gap: 8px;
}

.msg-notice {
    margin: 8px 0 0;
    font-size: 12px;
    color: #854d0e;
}

.composer {
    border-top: 1px solid var(--color-border-light);
    padding: 14px 16px;
}

.composer-input {
    width: 100%;
    min-height: 88px;
    resize: vertical;
}

.composer-actions {
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

@media (max-width: 1024px) {
    .chat-layout.admin {
        grid-template-columns: 1fr;
    }

    .session-pane {
        min-height: auto;
    }

    .session-list {
        max-height: 260px;
    }

    .message-scroller {
        max-height: 420px;
    }

    .msg-bubble {
        width: 100%;
    }
}
</style>
