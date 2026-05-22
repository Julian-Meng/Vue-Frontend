<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import {
    DataAnalysis,
    Calendar,
    Bell,
    OfficeBuilding,
    Promotion,
    User,
    UserFilled,
    Key,
    ChatDotRound,
} from '@element-plus/icons-vue';
import { useAuthStore } from '../src/stores/auth';
import { adminApi, getNoticeList, request, userApi } from '../apis';
import { formatNoticeListForDashboard } from '../utils/noticeFormatter';
import { isAdminLike, isSuperadmin, normalizeRole } from '../utils/roleUtils';
import AppSidebar from './dashboard/AppSidebar.vue';
import AppHeader from './dashboard/AppHeader.vue';
import OverviewPanel from './dashboard/panels/OverviewPanel.vue';
import AttendancePanel from './dashboard/panels/AttendancePanel.vue';
import NoticePanel from './dashboard/panels/NoticePanel.vue';
import DepartmentPanel from './dashboard/panels/DepartmentPanel.vue';
import PersonPanel from './dashboard/panels/PersonPanel.vue';
import PersonnelPanel from './dashboard/panels/PersonnelPanel.vue';
import AccountPanel from './dashboard/panels/AccountPanel.vue';
import ProfilePanel from './dashboard/panels/ProfilePanel.vue';
import PermissionPanel from './dashboard/panels/PermissionPanel.vue';
import SupportChatPanel from './dashboard/panels/SupportChatPanel.vue';
import './styles/dashboard-pages.css';

const router = useRouter();
const authStore = useAuthStore();
const { t, locale } = useI18n();

const sidebarCollapsed = ref(false);
const activeTab = ref('overview');
const role = ref('staff');
const dashboardData = ref(null);
const rawNotices = ref([]);
const loading = ref(true);
const dashboardRefreshing = ref(false);

function buildTodayParam() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function fetchTodayAttendanceCount(currentRole) {
    const date = buildTodayParam();
    const url = isAdminLike(currentRole) ? '/api/admin/attendance' : '/api/user/attendance/my';
    const payload = await request({
        url,
        method: 'GET',
        params: {
            start: date,
            end: date,
            page: 1,
            page_size: 1,
        },
        unwrap: false,
    });

    const total = Number(payload?.total ?? payload?.data?.length ?? 0);
    return Number.isFinite(total) ? total : 0;
}

function decodeJwtRole(token) {
    try {
        // base64url -> base64
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64));
        return payload.role || 'staff';
    } catch {
        return 'staff';
    }
}

function resolveInitialRole() {
    const storedRole = normalizeRole(authStore.role);
    if (storedRole) {
        return storedRole;
    }

    const decodedRole = normalizeRole(decodeJwtRole(authStore.token));
    if (decodedRole) {
        authStore.setRole(decodedRole, { persistence: authStore.persistence });
        return decodedRole;
    }

    return 'staff';
}

async function init() {
    if (!authStore.isAuthenticated) {
        router.push('/');
        return;
    }

    role.value = resolveInitialRole();

    try {
        await refreshDashboardData({ includeNotices: true, setLoading: true });
    } finally {
        loading.value = false;
    }
}

async function refreshDashboardData({ includeNotices = false, setLoading = false } = {}) {
    if (dashboardRefreshing.value) {
        return;
    }

    dashboardRefreshing.value = true;
    if (setLoading) {
        loading.value = true;
    }

    try {
        const dashboardPromise = isAdminLike(role.value)
            ? adminApi.getAdminDashboard()
            : userApi.getUserDashboard();
        const noticePromise = includeNotices
            ? getNoticeList({ page: 1, page_size: 5 })
            : Promise.resolve(null);

        const [dashboardResult, noticeResult] = await Promise.allSettled([
            dashboardPromise,
            noticePromise,
        ]);

        let dashboardPayload = null;

        if (dashboardResult.status === 'fulfilled') {
            dashboardPayload = dashboardResult.value;
        } else if (isAdminLike(role.value) && !isSuperadmin(role.value)) {
            try {
                dashboardPayload = await userApi.getUserDashboard();
                role.value = 'staff';
                authStore.setRole(role.value, { persistence: authStore.persistence });
            } catch {
                dashboardPayload = null;
            }
        }

        if (dashboardPayload && typeof dashboardPayload === 'object') {
            try {
                const attendanceCount = await fetchTodayAttendanceCount(role.value);
                dashboardPayload = {
                    ...dashboardPayload,
                    today_attendance: attendanceCount,
                    today_checkin: attendanceCount,
                };
            } catch {
                // Keep dashboard data even if attendance summary fails.
            }
        }

        dashboardData.value = dashboardPayload;

        if (noticeResult.status === 'fulfilled' && Array.isArray(noticeResult.value)) {
            rawNotices.value = noticeResult.value;
        }
    } finally {
        if (setLoading) {
            loading.value = false;
        }
        dashboardRefreshing.value = false;
    }
}

const navItems = computed(() => {
    const items = [
        { key: 'overview', label: t('dashboard.nav.overview'), icon: DataAnalysis },
        { key: 'attendance', label: t('dashboard.nav.attendance'), icon: Calendar },
        { key: 'notice', label: t('dashboard.nav.notice'), icon: Bell },
        { key: 'personnel', label: t('dashboard.nav.personnel'), icon: Promotion },
        { key: 'profile', label: t('dashboard.nav.profile'), icon: User },
        { key: 'permission', label: t('dashboard.nav.permission'), icon: Key },
    ];
    if (isAdminLike(role.value)) {
        items.splice(
            3,
            0,
            { key: 'person', label: t('dashboard.nav.person'), icon: User },
            { key: 'department', label: t('dashboard.nav.department'), icon: OfficeBuilding },
            { key: 'account', label: t('dashboard.nav.account'), icon: UserFilled }
        );
    }

    items.push({
        key: 'chat',
        label: t('dashboard.nav.chat'),
        icon: ChatDotRound,
    });

    return items;
});

const panelMap = {
    overview: OverviewPanel,
    attendance: AttendancePanel,
    notice: NoticePanel,
    person: PersonPanel,
    department: DepartmentPanel,
    personnel: PersonnelPanel,
    account: AccountPanel,
    profile: ProfilePanel,
    permission: PermissionPanel,
    chat: SupportChatPanel,
};

const currentPanel = computed(() => panelMap[activeTab.value]);
const activeLabel = computed(
    () => navItems.value.find((i) => i.key === activeTab.value)?.label ?? ''
);
const recentNotices = computed(() =>
    formatNoticeListForDashboard(rawNotices.value, {
        locale: locale.value,
        maxContentLength: 90,
        limit: 5,
    })
);

function logout() {
    authStore.clearToken();
    router.push('/');
}

function openSupportChatPanel() {
    activeTab.value = 'chat';
}

onMounted(init);

watch(
    () => activeTab.value,
    (nextTab) => {
        if (nextTab === 'overview') {
            refreshDashboardData({ includeNotices: true });
        }
    }
);
</script>

<template>
    <div class="dashboard-layout">
        <AppSidebar
            :items="navItems"
            :active="activeTab"
            :collapsed="sidebarCollapsed"
            @select="activeTab = $event"
            @toggle="sidebarCollapsed = !sidebarCollapsed"
        />
        <div class="main-area">
            <AppHeader
                :role="role"
                :active-label="activeLabel"
                @logout="logout"
                @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
            />
            <main class="panel-body">
                <div v-if="loading" class="center-state">{{ t('dashboard.loading') }}</div>
                <component
                    v-else
                    :is="currentPanel"
                    :role="role"
                    :dashboard-data="dashboardData"
                    :recent-notices="recentNotices"
                    @open-tab="activeTab = $event"
                />
            </main>
        </div>
    </div>
</template>
