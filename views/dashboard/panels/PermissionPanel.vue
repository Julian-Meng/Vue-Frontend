<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { userApi } from '../../../apis'
import { formatPermissionMatrix } from '../../../utils/permissionFormatter'

const { t } = useI18n()

const loading = ref(false)
const error = ref('')
const meta = ref({ currentRole: '', currentUser: '', total: 0 })
const rows = ref([])

async function fetchPermissions() {
  loading.value = true
  error.value = ''

  try {
    const result = await userApi.getPermissions()
    const normalized = formatPermissionMatrix(result)
    meta.value = normalized.meta
    rows.value = normalized.rows
  } catch (e) {
    error.value = e?.message || t('dashboard.permission.loadFailed')
    meta.value = { currentRole: '', currentUser: '', total: 0 }
    rows.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchPermissions)
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <h2 class="panel-title">{{ t('dashboard.nav.permission') }}</h2>
        <p class="panel-sub">{{ t('dashboard.permission.sub') }}</p>
      </div>
      <button class="btn btn-primary" @click="fetchPermissions">{{ t('dashboard.permission.refresh') }}</button>
    </div>

    <div v-if="!loading && !error" class="permission-summary-wrap">
      <p class="summary-line">
        {{ t('dashboard.permission.currentRole') }}: {{ meta.currentRole || '-' }}
        <span class="summary-sep">|</span>
        {{ t('dashboard.permission.total') }}: {{ meta.total }}
      </p>
    </div>

    <div v-if="loading" class="tip">{{ t('dashboard.loading') }}</div>
    <div v-else-if="error" class="tip error">{{ error }}</div>
    <div v-else-if="rows.length === 0" class="tip">{{ t('dashboard.common.noData') }}</div>
    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>{{ t('dashboard.permission.group') }}</th>
            <th>{{ t('dashboard.permission.name') }}</th>
            <th>{{ t('dashboard.permission.api') }}</th>
            <th>{{ t('dashboard.permission.roles') }}</th>
            <th>{{ t('dashboard.permission.status') }}</th>
            <th>{{ t('dashboard.permission.desc') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td class="cell-truncate" :title="row.group || '-'">{{ row.group || '-' }}</td>
            <td class="cell-truncate" :title="row.name || '-'">{{ row.name || '-' }}</td>
            <td class="api-cell api-cell-stack">
              <span class="api-method">{{ row.method || 'GET' }}</span>
              <span class="api-path">{{ row.path || row.key || '-' }}</span>
            </td>
            <td>
              <div v-if="row.allowedRoles?.length" class="role-list">
                <span v-for="roleName in row.allowedRoles" :key="`${row.id}-${roleName}`" class="badge">
                  {{ roleName }}
                </span>
              </div>
              <span v-else class="text-muted">-</span>
            </td>
            <td>
              <span class="status-tag" :class="row.hasAccess ? 'allow' : 'deny'">
                {{ row.hasAccess ? t('dashboard.permission.allow') : t('dashboard.permission.deny') }}
              </span>
            </td>
            <td class="cell-truncate" :title="row.description || '-'">{{ row.description || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<style scoped>
@import '../../styles/panel-common.css';

.permission-summary-wrap {
  margin-bottom: 12px;
}

.summary-line {
  margin-top: 4px;
  font-size: 16px;
  font-weight: 500;
  color: #334155;
}

.summary-sep {
  margin: 0 8px;
  color: #94a3b8;
}

.api-cell-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.api-method {
  width: fit-content;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: #075985;
  background: #e0f2fe;
}

.api-path {
  word-break: break-all;
}

.role-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

@media (max-width: 900px) {
  .summary-line.secondary {
    line-height: 1.4;
  }
}
</style>
