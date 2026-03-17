<script setup>
import { useI18n } from 'vue-i18n'

defineProps({
  items:     { type: Array,   required: true },
  active:    { type: String,  required: true },
  collapsed: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'toggle'])
const { t } = useI18n()
</script>

<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="sidebar-header">
      <span v-if="!collapsed" class="sidebar-title">{{ t('dashboard.appTitle') }}</span>
      <button class="toggle-btn" :title="collapsed ? t('dashboard.expandSidebar') : t('dashboard.collapseSidebar')" @click="emit('toggle')">
        {{ collapsed ? '»' : '«' }}
      </button>
    </div>

    <nav class="sidebar-nav">
      <button
        v-for="item in items"
        :key="item.key"
        class="nav-item"
        :class="{ active: active === item.key }"
        :title="collapsed ? item.label : ''"
        @click="emit('select', item.key)"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
      </button>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  background: #1e293b;
  color: #cbd5e1;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.22s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 56px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 56px;
  border-bottom: 1px solid #334155;
  flex-shrink: 0;
}

.sidebar.collapsed .sidebar-header {
  justify-content: center;
}

.sidebar-title {
  font-weight: 700;
  font-size: 14px;
  color: #f1f5f9;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.toggle-btn {
  background: none;
  border: 1px solid #475569;
  color: #94a3b8;
  width: 26px;
  height: 26px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.15s, color 0.15s;
}

.toggle-btn:hover {
  border-color: #64748b;
  color: #e2e8f0;
}

.sidebar-nav {
  flex: 1;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  height: 44px;
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
  text-align: left;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s;
  border-radius: 0;
  width: 100%;
}

.sidebar.collapsed .nav-item {
  justify-content: center;
  padding: 0;
}

.nav-item:hover {
  background: #334155;
  color: #e2e8f0;
}

.nav-item.active {
  background: #2563eb;
  color: #fff;
}

.nav-icon {
  font-size: 16px;
  flex-shrink: 0;
  width: 22px;
  text-align: center;
}

.nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
