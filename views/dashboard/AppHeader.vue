<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { toggleLocale } from '../../utils/i18n';
import { isAdminLike, isSuperadmin, normalizeRole } from '../../utils/roleUtils';

const props = defineProps({
    role: { type: String, default: 'user' },
    activeLabel: { type: String, default: '' },
});

const emit = defineEmits(['logout', 'toggle-sidebar']);
const { t } = useI18n();

const normalizedRole = computed(() => normalizeRole(props.role));
const roleLabel = computed(() => {
    if (isSuperadmin(normalizedRole.value)) {
        return t('dashboard.roleSuperadmin');
    }

    if (isAdminLike(normalizedRole.value)) {
        return t('dashboard.roleAdmin');
    }

    return t('dashboard.roleUser');
});
</script>

<template>
    <header class="app-header">
        <div class="header-left">
            <button
                class="menu-btn"
                :title="t('dashboard.toggleSidebar')"
                @click="emit('toggle-sidebar')"
            >
                ☰
            </button>
            <span class="page-title">{{ activeLabel }}</span>
        </div>
        <div class="header-right">
            <button class="locale-btn" @click="toggleLocale">{{ t('common.switchTo') }}</button>
            <span class="role-badge" :class="normalizedRole">
                {{ roleLabel }}
            </span>
            <button class="logout-btn" @click="emit('logout')">{{ t('dashboard.logout') }}</button>
        </div>
    </header>
</template>
