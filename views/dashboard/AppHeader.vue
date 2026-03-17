<script setup>
import { useI18n } from 'vue-i18n'
import { toggleLocale } from '../../utils/i18n'

defineProps({
  role:        { type: String,  default: 'user' },
  activeLabel: { type: String,  default: '' },
})

const emit = defineEmits(['logout', 'toggle-sidebar'])
const { t } = useI18n()
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <button class="menu-btn" :title="t('dashboard.toggleSidebar')" @click="emit('toggle-sidebar')">☰</button>
      <span class="page-title">{{ activeLabel }}</span>
    </div>
    <div class="header-right">
      <button class="locale-btn" @click="toggleLocale">{{ t('common.switchTo') }}</button>
      <span class="role-badge" :class="role">
        {{ role === 'admin' ? t('dashboard.roleAdmin') : t('dashboard.roleUser') }}
      </span>
      <button class="logout-btn" @click="emit('logout')">{{ t('dashboard.logout') }}</button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-btn {
  background: none;
  border: none;
  color: #64748b;
  font-size: 20px;
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
  border-radius: 4px;
  transition: background 0.12s, color 0.12s;
}

.menu-btn:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.locale-btn {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #475569;
  border-radius: 6px;
  height: 30px;
  padding: 0 12px;
  cursor: pointer;
  font-size: 12px;
  transition: border-color 0.15s, color 0.15s;
}

.locale-btn:hover {
  border-color: #94a3b8;
  color: #1e293b;
}

.role-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 99px;
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 500;
}

.role-badge.admin {
  background: #fce7f3;
  color: #be185d;
}

.logout-btn {
  background: none;
  border: 1px solid #e2e8f0;
  color: #475569;
  padding: 5px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: border-color 0.15s, color 0.15s;
}

.logout-btn:hover {
  border-color: #94a3b8;
  color: #1e293b;
}
</style>
