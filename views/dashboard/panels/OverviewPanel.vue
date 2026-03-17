<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  role:          { type: String, default: 'user' },
  dashboardData: { type: Object, default: null },
})
const { t } = useI18n()

// 尝试把后端返回的 dashboardData 解析成若干统计卡片。
// 后端字段名不固定，做宽松的 key 匹配，未匹配字段仍用原始 key 展示。
const LABEL_KEYS = [
  'total_employees',
  'total_staff',
  'employee_count',
  'department_count',
  'departments',
  'pending_changes',
  'pending',
  'today_checkin',
  'today_attendance',
  'unread_notices',
  'notice_count',
  'attendance_rate',
  'checkin_status',
  'checkin_time',
  'checkout_time',
]

const statCards = computed(() => {
  if (!props.dashboardData || typeof props.dashboardData !== 'object') return []
  return Object.entries(props.dashboardData).map(([key, value]) => ({
    key,
    label: LABEL_KEYS.includes(key) ? t(`dashboard.overview.labels.${key}`) : key,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—'),
  }))
})
</script>

<template>
  <div class="overview-panel">
    <h2 class="panel-title">{{ t('dashboard.overview.title') }}</h2>
    <p class="panel-sub">{{ role === 'admin' ? t('dashboard.overview.adminSub') : t('dashboard.overview.userSub') }}</p>

    <div v-if="!dashboardData" class="empty-tip">
      {{ t('dashboard.overview.noData') }}
    </div>

    <div v-else-if="statCards.length === 0" class="empty-tip">{{ t('dashboard.overview.emptyData') }}</div>

    <div v-else class="stat-grid">
      <div v-for="card in statCards" :key="card.key" class="stat-card">
        <div class="stat-value">{{ card.value }}</div>
        <div class="stat-label">{{ card.label }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overview-panel {
  max-width: 900px;
}

.panel-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 4px;
}

.panel-sub {
  color: #64748b;
  font-size: 14px;
  margin: 0 0 24px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.stat-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: #2563eb;
  line-height: 1;
  word-break: break-all;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
}

.empty-tip {
  color: #94a3b8;
  font-size: 14px;
  padding: 40px 0;
}
</style>
