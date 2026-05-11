<script setup>
import { computed, ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getNoticeList, adminApi } from '../../../apis';
import { formatNoticeListForDashboard } from '../../../utils/noticeFormatter';
import { exportToExcel } from '../../../utils/excelExport';

const props = defineProps({
    role: { type: String, default: 'user' },
});
const { t, locale } = useI18n();

const isAdmin = () => props.role === 'admin';
const isReadOnly = computed(() => !isAdmin());
const noticeModalTitle = computed(() => {
    if (!editTarget.value) {
        return t('dashboard.notice.create');
    }
    return isAdmin() ? t('dashboard.notice.edit') : t('dashboard.notice.detail');
});

const notices = ref([]);
const loading = ref(false);
const error = ref('');
const page = ref(1);
const pageSize = 10;

// 弹窗
const showModal = ref(false);
const editTarget = ref(null); // null = 新建
const form = ref({ title: '', content: '', publisher: '' });
const saving = ref(false);

const formattedNotices = computed(() =>
    formatNoticeListForDashboard(notices.value, {
        locale: locale.value,
        maxContentLength: 120,
    })
);

async function fetchNotices() {
    loading.value = true;
    error.value = '';
    try {
        const params = { page: page.value, page_size: pageSize };
        notices.value = await getNoticeList(params);
        if (!Array.isArray(notices.value)) notices.value = [];
    } catch (e) {
        error.value = e?.message || t('dashboard.notice.loadFailed');
        notices.value = [];
    } finally {
        loading.value = false;
    }
}

function openCreate() {
    editTarget.value = null;
    form.value = { title: '', content: '', publisher: '' };
    showModal.value = true;
}

function openEdit(item) {
    editTarget.value = item;
    form.value = {
        title: item.title ?? '',
        content: item.content ?? '',
        publisher: item.publisher ?? '',
    };
    showModal.value = true;
}

function closeModal() {
    showModal.value = false;
}

async function saveNotice() {
    if (!form.value.title.trim()) {
        ElMessage.warning(t('dashboard.notice.messages.titleRequired'));
        return;
    }
    saving.value = true;
    try {
        if (editTarget.value) {
            await adminApi.updateNotice(undefined, editTarget.value.id, form.value);
        } else {
            await adminApi.createNotice(undefined, form.value);
        }
        closeModal();
        ElMessage.success(t('dashboard.notice.messages.saveSuccess'));
        await fetchNotices();
    } catch (e) {
        ElMessage.error(e?.message || t('dashboard.notice.messages.saveFailed'));
    } finally {
        saving.value = false;
    }
}

async function deleteNotice(id) {
    try {
        await ElMessageBox.confirm(
            t('dashboard.notice.messages.deleteConfirmMessage'),
            t('dashboard.notice.messages.deleteConfirmTitle'),
            {
                confirmButtonText: t('dashboard.common.confirm'),
                cancelButtonText: t('dashboard.common.cancel'),
                type: 'warning',
            }
        );
    } catch {
        return;
    }

    try {
        await adminApi.deleteNotice(undefined, id);
        ElMessage.success(t('dashboard.notice.messages.deleteSuccess'));
        await fetchNotices();
    } catch (e) {
        ElMessage.error(e?.message || t('dashboard.notice.messages.deleteFailed'));
    }
}

function prevPage() {
    if (page.value > 1) {
        page.value--;
        fetchNotices();
    }
}
function nextPage() {
    if (notices.value.length >= pageSize) {
        page.value++;
        fetchNotices();
    }
}

function exportNotices() {
    if (formattedNotices.value.length === 0) {
        ElMessage.warning(t('dashboard.common.exportNoData'));
        return;
    }

    try {
        exportToExcel({
            fileName: t('dashboard.notice.export.fileName', { page: page.value }),
            sheetName: t('dashboard.notice.export.sheetName'),
            rows: formattedNotices.value,
            columns: [
                { key: 'id', label: t('dashboard.notice.export.columns.id') },
                { key: 'title', label: t('dashboard.notice.export.columns.title') },
                {
                    key: 'summary',
                    label: t('dashboard.notice.export.columns.summary'),
                    formatter: (row) => row.summary || row.content || '—',
                },
                {
                    key: 'createdAtText',
                    label: t('dashboard.notice.export.columns.createdAt'),
                    formatter: (row) => row.createdAtText || '—',
                },
            ],
        });
        ElMessage.success(t('dashboard.common.exportSuccess'));
    } catch (e) {
        ElMessage.error(e?.message || t('dashboard.common.exportFailed'));
    }
}

onMounted(fetchNotices);
</script>

<template>
    <div class="panel">
        <div class="panel-header">
            <div>
                <h2 class="panel-title">{{ t('dashboard.nav.notice') }}</h2>
                <p class="panel-sub">{{ t('dashboard.notice.sub') }}</p>
            </div>
            <button v-if="isAdmin()" class="btn btn-primary" @click="openCreate">
                + {{ t('dashboard.notice.create') }}
            </button>
        </div>

        <div class="toolbar">
            <button
                class="btn btn-primary"
                @click="
                    () => {
                        page = 1;
                        fetchNotices();
                    }
                "
            >
                {{ t('dashboard.common.query') }}
            </button>
            <button class="btn btn-secondary" @click="exportNotices">
                {{ t('dashboard.common.exportExcel') }}
            </button>
        </div>

        <div v-if="loading" class="tip">{{ t('dashboard.loading') }}</div>
        <div v-else-if="error" class="tip error">{{ error }}</div>
        <div v-else-if="formattedNotices.length === 0" class="tip">
            {{ t('dashboard.common.noData') }}
        </div>
        <div v-else class="notice-list">
            <article
                v-for="item in formattedNotices"
                :key="item.id || item.title"
                class="notice-card"
            >
                <header class="notice-card-header">
                    <div>
                        <h3 class="notice-title">
                            <button class="notice-title-trigger" @click="openEdit(item)">
                                {{ item.title }}
                            </button>
                        </h3>
                        <div class="notice-meta">
                            <span v-if="item.id" class="notice-meta-item">
                                {{ t('dashboard.notice.idPrefix') }}: {{ item.id }}
                            </span>
                            <span class="notice-meta-item">{{ item.createdAtText || '—' }}</span>
                            <span v-if="item.publisher" class="notice-meta-item">
                                {{ t('dashboard.notice.publisherPrefix') }}{{ item.publisher }}
                            </span>
                        </div>
                    </div>
                    <div v-if="isAdmin()" class="notice-actions">
                        <button class="btn-link" @click.stop="openEdit(item)">
                            {{ t('dashboard.notice.actions.edit') }}
                        </button>
                        <button class="btn-link danger" @click.stop="deleteNotice(item.id)">
                            {{ t('dashboard.notice.actions.delete') }}
                        </button>
                    </div>
                </header>
                <div class="notice-content">{{ item.content || item.summary || '—' }}</div>
            </article>
        </div>

        <div v-if="!loading && !error" class="pagination">
            <button :disabled="page <= 1" class="btn btn-ghost" @click="prevPage">
                {{ t('dashboard.common.prevPage') }}
            </button>
            <span class="page-info">{{ t('dashboard.common.pageN', { page }) }}</span>
            <button
                :disabled="formattedNotices.length < pageSize"
                class="btn btn-ghost"
                @click="nextPage"
            >
                {{ t('dashboard.common.nextPage') }}
            </button>
        </div>

        <!-- 弹窗 -->
        <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
            <div class="modal-box notice-modal">
                <div class="notice-modal-title">
                    <h3 class="modal-title">{{ noticeModalTitle }}</h3>
                    <span v-if="isReadOnly" class="notice-view-badge">
                        {{ t('dashboard.notice.viewMode') }}
                    </span>
                </div>
                <div class="notice-form-grid">
                    <div class="form-row">
                        <label>{{ t('dashboard.notice.form.title') }}</label>
                        <input
                            v-model="form.title"
                            class="input"
                            :placeholder="t('dashboard.notice.placeholder.title')"
                            :readonly="isReadOnly"
                        />
                    </div>
                    <div class="form-row">
                        <label>{{ t('dashboard.notice.form.publisher') }}</label>
                        <input
                            v-model="form.publisher"
                            class="input"
                            :placeholder="t('dashboard.notice.placeholder.publisher')"
                            :readonly="isReadOnly"
                        />
                    </div>
                </div>
                <div class="form-row notice-content-row">
                    <label>{{ t('dashboard.notice.form.content') }}</label>
                    <textarea
                        v-model="form.content"
                        class="input"
                        rows="8"
                        :placeholder="t('dashboard.notice.placeholder.content')"
                        :readonly="isReadOnly"
                    />
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" @click="closeModal">
                        {{ t('dashboard.common.cancel') }}
                    </button>
                    <button
                        v-if="isAdmin()"
                        :disabled="saving"
                        class="btn btn-primary"
                        @click="saveNotice"
                    >
                        {{ saving ? t('dashboard.notice.saving') : t('dashboard.common.save') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
@import '../../styles/panel-common.css';
@import '../../styles/dashboard-pages.css';
@import '../../styles/notice-panel.css';
</style>
