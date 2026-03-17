<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../src/stores/auth'
import { adminApi, userApi } from '../apis'
import AppSidebar from './dashboard/AppSidebar.vue'
import AppHeader from './dashboard/AppHeader.vue'
import OverviewPanel from './dashboard/panels/OverviewPanel.vue'
import AttendancePanel from './dashboard/panels/AttendancePanel.vue'
import NoticePanel from './dashboard/panels/NoticePanel.vue'
import DepartmentPanel from './dashboard/panels/DepartmentPanel.vue'
import PersonnelPanel from './dashboard/panels/PersonnelPanel.vue'
import AccountPanel from './dashboard/panels/AccountPanel.vue'
import ProfilePanel from './dashboard/panels/ProfilePanel.vue'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const sidebarCollapsed = ref(false)
const activeTab = ref('overview')
const role = ref('user')
const dashboardData = ref(null)
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
    if (role.value === 'admin') {
      dashboardData.value = await adminApi.getAdminDashboard()
    } else {
      dashboardData.value = await userApi.getUserDashboard()
    }
  } catch {
    // JWT role may mismatch actual permission; try user API as fallback
    if (role.value === 'admin') {
      try {
        dashboardData.value = await userApi.getUserDashboard()
        role.value = 'user'
      } catch { /* ignore, show empty overview */ }
    }
  } finally {
    loading.value = false
  }
}

const navItems = computed(() => {
  const items = [
    { key: 'overview',    label: t('dashboard.nav.overview'),   icon: '◫' },
    { key: 'attendance',  label: t('dashboard.nav.attendance'), icon: '⊙' },
    { key: 'notice',      label: t('dashboard.nav.notice'),     icon: '◎' },
    { key: 'personnel',   label: t('dashboard.nav.personnel'),  icon: '⇅' },
    { key: 'profile',     label: t('dashboard.nav.profile'),    icon: '◉' },
  ]
  if (role.value === 'admin') {
    items.splice(3, 0,
      { key: 'department', label: t('dashboard.nav.department'), icon: '⊞' },
      { key: 'account',    label: t('dashboard.nav.account'),    icon: '⊕' },
    )
  }
  return items
})

const panelMap = {
  overview:   OverviewPanel,
  attendance: AttendancePanel,
  notice:     NoticePanel,
  department: DepartmentPanel,
  personnel:  PersonnelPanel,
  account:    AccountPanel,
  profile:    ProfilePanel,
}

const currentPanel = computed(() => panelMap[activeTab.value])
const activeLabel  = computed(() => navItems.value.find(i => i.key === activeTab.value)?.label ?? '')

function logout() {
  authStore.clearToken()
  router.push('/')
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
        />
      </main>
    </div>
  </div>
</template>

<style scoped>
.dashboard-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #f8fafc;
  font-family: system-ui, -apple-system, sans-serif;
}

.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.center-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #64748b;
  font-size: 16px;
}
</style>
