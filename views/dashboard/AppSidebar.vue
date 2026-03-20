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
      <span v-if="!collapsed" class="sidebar-title">Vue CMS</span>
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
        <span class="nav-icon">
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
        </span>
        <span v-if="!collapsed" class="nav-label">{{ item.label }}</span>
      </button>
    </nav>
  </aside>
</template>
