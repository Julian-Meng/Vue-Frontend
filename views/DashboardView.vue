<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
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
} from '@element-plus/icons-vue'
import { useAuthStore } from '../src/stores/auth'
import { adminApi, getNoticeList, userApi } from '../apis'
import { formatNoticeListForDashboard } from '../utils/noticeFormatter'
import AppSidebar from './dashboard/AppSidebar.vue'
import AppHeader from './dashboard/AppHeader.vue'
import OverviewPanel from './dashboard/panels/OverviewPanel.vue'
import AttendancePanel from './dashboard/panels/AttendancePanel.vue'
import NoticePanel from './dashboard/panels/NoticePanel.vue'
import DepartmentPanel from './dashboard/panels/DepartmentPanel.vue'
import PersonPanel from './dashboard/panels/PersonPanel.vue'
import PersonnelPanel from './dashboard/panels/PersonnelPanel.vue'
import AccountPanel from './dashboard/panels/AccountPanel.vue'
import ProfilePanel from './dashboard/panels/ProfilePanel.vue'
import PermissionPanel from './dashboard/panels/PermissionPanel.vue'
import AIChatPanel from './dashboard/panels/AIChatPanel.vue'
import './styles/dashboard-pages.css'

const router = useRouter()
const authStore = useAuthStore()
const { t, locale } = useI18n()

const sidebarCollapsed = ref(false)
const activeTab = ref('overview')
const role = ref('user')
const dashboardData = ref(null)
const rawNotices = ref([])
const loading = ref(true)

function decodeJwtRole(token) {
  try {
    // base64url -> base64
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    return payload.role || 'user'
  } catch {
    return 'user'
  }
}

async function init() {
  if (!authStore.isAuthenticated) {
    router.push('/')
    return
  }

  role.value = decodeJwtRole(authStore.token)

  try {
    const dashboardPromise =
      role.value === 'admin' ? adminApi.getAdminDashboard() : userApi.getUserDashboard()

    const [dashboardResult, noticeResult] = await Promise.allSettled([
      dashboardPromise,
      getNoticeList({ page: 1, page_size: 5 }),
    ])

    if (dashboardResult.status === 'fulfilled') {
      dashboardData.value = dashboardResult.value
    } else if (role.value === 'admin') {
      try {
        dashboardData.value = await userApi.getUserDashboard()
        role.value = 'user'
      } catch {
        dashboardData.value = null
      }
    }

    if (noticeResult.status === 'fulfilled' && Array.isArray(noticeResult.value)) {
      rawNotices.value = noticeResult.value
    }
  } finally {
    loading.value = false
  }
}

const navItems = computed(() => {
  const items = [
    { key: 'overview',    label: t('dashboard.nav.overview'),   icon: DataAnalysis },
    { key: 'attendance',  label: t('dashboard.nav.attendance'), icon: Calendar },
    { key: 'notice',      label: t('dashboard.nav.notice'),     icon: Bell },
    { key: 'personnel',   label: t('dashboard.nav.personnel'),  icon: Promotion },
    { key: 'profile',     label: t('dashboard.nav.profile'),    icon: User },
    { key: 'permission',  label: t('dashboard.nav.permission'), icon: Key },
  ]
  if (role.value === 'admin') {
    items.splice(3, 0,
      { key: 'person',     label: t('dashboard.nav.person'),     icon: User },
      { key: 'department', label: t('dashboard.nav.department'), icon: OfficeBuilding },
      { key: 'account',    label: t('dashboard.nav.account'),    icon: UserFilled },
    )
  }

  items.push({
    key: 'ai',
    label: t('dashboard.nav.ai'),
    icon: ChatDotRound,
  })

  return items
})

const panelMap = {
  overview:   OverviewPanel,
  attendance: AttendancePanel,
  notice:     NoticePanel,
  person:     PersonPanel,
  department: DepartmentPanel,
  personnel:  PersonnelPanel,
  account:    AccountPanel,
  profile:    ProfilePanel,
  permission: PermissionPanel,
  ai:         AIChatPanel,
}

const currentPanel = computed(() => panelMap[activeTab.value])
const activeLabel  = computed(() => navItems.value.find(i => i.key === activeTab.value)?.label ?? '')
const recentNotices = computed(() =>
  formatNoticeListForDashboard(rawNotices.value, {
    locale: locale.value,
    maxContentLength: 90,
    limit: 5,
  }),
)

function logout() {
  authStore.clearToken()
  router.push('/')
}

function openAIPanel() {
  activeTab.value = 'ai'
}

onMounted(init)
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
