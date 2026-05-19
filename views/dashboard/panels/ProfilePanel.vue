<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { useAuthStore } from '../../../src/stores/auth';
import { exportToExcel } from '../../../utils/excelExport';
import {
    fetchMyProfile,
    fetchProfileByEmpId,
    saveProfileByRole,
} from '../../../utils/profileService';

const props = defineProps({
    role: { type: String, default: 'user' },
});

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const profile = ref(null);
const myProfile = ref(null);
const myEmpId = ref('');
const viewingOwn = ref(true);

const loading = ref(false);
const searching = ref(false);
const saving = ref(false);
const error = ref('');

const editing = ref(false);
const form = ref({});

const searchEmpId = ref('');

function isAdmin() {
    const role = String(props.role || '').toLowerCase();
    return role === 'admin' || role === 'superadmin';
}

const profileSub = computed(() =>
    viewingOwn.value ? t('dashboard.profile.subOwn') : t('dashboard.profile.subOther')
);

const viewingText = computed(() => {
    if (viewingOwn.value) {
        return t('dashboard.profile.viewingSelf');
    }

    const name = profile.value?.name || profile.value?.emp_id || '-';
    return t('dashboard.profile.viewingOther', { name });
});

const summaryInfo = computed(() => {
    const current = profile.value || {};

    return {
        name: displayValue(current.name),
        empId: displayValue(current.emp_id),
        department: displayValue(current.department),
        position: displayValue(current.position),
    };
});

const sections = computed(() => {
    const current = profile.value || {};

    return [
        {
            key: 'basic',
            title: t('dashboard.profile.sections.basic'),
            fields: [
                {
                    key: 'name',
                    label: t('dashboard.profile.fields.name'),
                    value: displayValue(current.name),
                    editable: true,
                },
                {
                    key: 'sex',
                    label: t('dashboard.profile.fields.gender'),
                    value: displayValue(current.sex),
                    editable: false,
                },
                {
                    key: 'status',
                    label: t('dashboard.profile.fields.status'),
                    value: statusMeta(current).text,
                    editable: false,
                },
                {
                    key: 'hire_date',
                    label: t('dashboard.profile.fields.hireDate'),
                    value: displayValue(current.hire_date),
                    editable: false,
                },
            ],
        },
        {
            key: 'organization',
            title: t('dashboard.profile.sections.organization'),
            fields: [
                {
                    key: 'emp_id',
                    label: t('dashboard.profile.fields.empId'),
                    value: displayValue(current.emp_id),
                    editable: false,
                },
                {
                    key: 'department',
                    label: t('dashboard.profile.fields.department'),
                    value: displayValue(current.department),
                    editable: false,
                },
                {
                    key: 'position',
                    label: t('dashboard.profile.fields.position'),
                    value: displayValue(current.position),
                    editable: false,
                },
            ],
        },
        {
            key: 'contact',
            title: t('dashboard.profile.sections.contact'),
            fields: [
                {
                    key: 'tel',
                    label: t('dashboard.profile.fields.phone'),
                    value: displayValue(current.tel),
                    editable: true,
                },
                {
                    key: 'email',
                    label: t('dashboard.profile.fields.email'),
                    value: displayValue(current.email),
                    editable: true,
                },
                {
                    key: 'addr',
                    label: t('dashboard.profile.fields.address'),
                    value: displayValue(current.addr),
                    editable: true,
                    type: 'textarea',
                },
            ],
        },
    ];
});

function displayValue(value) {
    return value === undefined || value === null || value === '' ? '-' : String(value);
}

function textOrEmpty(value) {
    return String(value ?? '').trim();
}

function statusMeta(targetProfile) {
    const raw = targetProfile?.status;

    if (raw === 1 || raw === '1') {
        return {
            className: 'success',
            text: t('dashboard.profile.state.employed'),
        };
    }

    if (raw === 0 || raw === '0') {
        return {
            className: 'danger',
            text: t('dashboard.profile.state.resigned'),
        };
    }

    const normalized = String(raw ?? '')
        .trim()
        .toLowerCase();

    if (['在职', 'active', 'enabled'].includes(normalized)) {
        return {
            className: 'success',
            text: t('dashboard.profile.state.employed'),
        };
    }

    if (['离职', 'inactive', 'disabled'].includes(normalized)) {
        return {
            className: 'danger',
            text: t('dashboard.profile.state.resigned'),
        };
    }

    return {
        className: '',
        text: displayValue(raw) === '-' ? t('dashboard.profile.state.unknown') : displayValue(raw),
    };
}

function syncFormWithProfile() {
    form.value = profile.value ? { ...profile.value } : {};
}

function refreshOwnFlags() {
    const currentEmpId = textOrEmpty(profile.value?.emp_id);
    const mineEmpId = textOrEmpty(myEmpId.value);

    if (!currentEmpId || !mineEmpId) {
        viewingOwn.value = false;
        return;
    }

    viewingOwn.value = currentEmpId === mineEmpId;
}

function handleRequestError(err, fallbackKey, { silent = false } = {}) {
    const status = Number(err?.status ?? 0);
    const fallbackMessage = t(fallbackKey);
    const message = textOrEmpty(err?.message) || fallbackMessage;

    if (status === 401) {
        const authExpired = t('dashboard.profile.errors.unauthorized');
        if (!silent) ElMessage.error(authExpired);
        authStore.clearToken();
        router.push('/');
        return authExpired;
    }

    if (status === 403) {
        const forbidden = t('dashboard.profile.errors.forbidden');
        if (!silent) ElMessage.warning(forbidden);
        return forbidden;
    }

    if (status === 400 && message.includes('请求解析失败')) {
        const parseFailed = t('dashboard.profile.errors.parseFailed');
        if (!silent) ElMessage.warning(parseFailed);
        return parseFailed;
    }

    if (!silent) {
        ElMessage.error(message);
    }

    return message;
}

async function loadMyProfile() {
    loading.value = true;
    error.value = '';

    try {
        const mine = await fetchMyProfile();
        profile.value = mine;
        myProfile.value = mine ? { ...mine } : null;
        myEmpId.value = textOrEmpty(mine?.emp_id);
        viewingOwn.value = true;
        syncFormWithProfile();
    } catch (err) {
        error.value = handleRequestError(err, 'dashboard.profile.loadFailed', { silent: true });
    } finally {
        loading.value = false;
    }
}

async function searchProfile() {
    const empId = textOrEmpty(searchEmpId.value);
    if (!empId) {
        ElMessage.warning(t('dashboard.profile.validation.empIdRequired'));
        return;
    }

    searching.value = true;
    error.value = '';

    try {
        const target = await fetchProfileByEmpId(empId);
        if (!target) {
            throw new Error(t('dashboard.profile.messages.searchFailed'));
        }

        profile.value = target;
        syncFormWithProfile();
        refreshOwnFlags();
    } catch (err) {
        error.value = handleRequestError(err, 'dashboard.profile.messages.searchFailed', {
            silent: true,
        });
    } finally {
        searching.value = false;
    }
}

function backToMine() {
    editing.value = false;
    error.value = '';

    if (myProfile.value) {
        profile.value = { ...myProfile.value };
        viewingOwn.value = true;
        syncFormWithProfile();
        return;
    }

    loadMyProfile();
}

function startEdit() {
    if (!profile.value) return;
    editing.value = true;
    syncFormWithProfile();
}

function cancelEdit() {
    editing.value = false;
    syncFormWithProfile();
}

async function saveProfile() {
    if (!profile.value) {
        ElMessage.warning(t('dashboard.profile.validation.profileMissing'));
        return;
    }

    const wasViewingOwn = viewingOwn.value;
    saving.value = true;

    try {
        const updated = await saveProfileByRole({
            role: props.role,
            targetProfile: profile.value,
            formData: form.value,
            isSelf: viewingOwn.value,
        });

        profile.value = { ...(profile.value || {}), ...(updated || {}) };
        syncFormWithProfile();

        if (wasViewingOwn) {
            myProfile.value = { ...profile.value };
            myEmpId.value = textOrEmpty(profile.value?.emp_id);
            viewingOwn.value = true;
        } else {
            refreshOwnFlags();
        }

        editing.value = false;
        ElMessage.success(t('dashboard.profile.messages.saveSuccess'));
    } catch (err) {
        handleRequestError(err, 'dashboard.profile.messages.saveFailed');
    } finally {
        saving.value = false;
    }
}

function exportProfile() {
    if (!profile.value) {
        ElMessage.warning(t('dashboard.common.exportNoData'));
        return;
    }

    const rows = [];
    sections.value.forEach((section) => {
        section.fields.forEach((field) => {
            rows.push({
                section: section.title,
                field: field.label,
                value: field.key === 'status' ? statusMeta(profile.value).text : field.value,
            });
        });
    });

    try {
        exportToExcel({
            fileName: `profile_${textOrEmpty(profile.value?.emp_id) || 'me'}`,
            sheetName: t('dashboard.profile.export.sheet'),
            rows,
            columns: [
                { key: 'section', label: t('dashboard.profile.export.section') },
                { key: 'field', label: t('dashboard.profile.export.field') },
                { key: 'value', label: t('dashboard.profile.export.value') },
            ],
        });
        ElMessage.success(t('dashboard.common.exportSuccess'));
    } catch (err) {
        ElMessage.error(err?.message || t('dashboard.common.exportFailed'));
    }
}

onMounted(loadMyProfile);
</script>

<template>
    <div class="panel">
        <div class="panel-header">
            <div>
                <h2 class="panel-title">{{ t('dashboard.nav.profile') }}</h2>
                <p class="panel-sub">{{ profileSub }}</p>
            </div>
            <div class="header-actions">
                <button v-if="isAdmin() && !viewingOwn" class="btn btn-ghost" @click="backToMine">
                    {{ t('dashboard.profile.returnMine') }}
                </button>
                <button class="btn btn-secondary" @click="exportProfile">
                    {{ t('dashboard.common.exportExcel') }}
                </button>
                <button
                    v-if="!editing"
                    :disabled="!profile"
                    class="btn btn-primary"
                    @click="startEdit"
                >
                    {{ t('dashboard.profile.edit') }}
                </button>
                <template v-else>
                    <button :disabled="saving" class="btn btn-primary" @click="saveProfile">
                        {{ saving ? t('dashboard.profile.saving') : t('dashboard.common.save') }}
                    </button>
                    <button class="btn btn-ghost" @click="cancelEdit">
                        {{ t('dashboard.common.cancel') }}
                    </button>
                </template>
            </div>
        </div>

        <div v-if="isAdmin()" class="toolbar search-toolbar">
            <input
                v-model="searchEmpId"
                class="input"
                :placeholder="t('dashboard.profile.searchPlaceholder')"
                @keyup.enter="searchProfile"
            />
            <button :disabled="searching" class="btn btn-primary" @click="searchProfile">
                {{ searching ? t('dashboard.profile.searching') : t('dashboard.common.query') }}
            </button>
            <span class="viewing-tag">{{ viewingText }}</span>
        </div>

        <div v-if="loading" class="tip">{{ t('dashboard.loading') }}</div>
        <div v-else-if="error" class="tip error">{{ error }}</div>
        <div v-else-if="!profile" class="tip">{{ t('dashboard.profile.empty') }}</div>

        <div v-else class="profile-shell">
            <section class="profile-hero">
                <div class="hero-name">{{ summaryInfo.name }}</div>
                <div class="hero-sub">{{ summaryInfo.empId }}</div>
                <div class="hero-meta">
                    <span>{{ summaryInfo.department }}</span>
                    <span>/</span>
                    <span>{{ summaryInfo.position }}</span>
                </div>
                <span class="status-badge" :class="statusMeta(profile).className">
                    {{ statusMeta(profile).text }}
                </span>
            </section>

            <div class="profile-grid">
                <article v-for="section in sections" :key="section.key" class="profile-section">
                    <h3 class="section-title">{{ section.title }}</h3>
                    <div class="section-content">
                        <div v-for="field in section.fields" :key="field.key" class="field-row">
                            <span class="field-label">{{ field.label }}</span>

                            <template v-if="editing && field.editable">
                                <textarea
                                    v-if="field.type === 'textarea'"
                                    v-model="form[field.key]"
                                    class="input"
                                    rows="3"
                                />
                                <input v-else v-model="form[field.key]" class="input" />
                            </template>

                            <span v-else-if="field.key === 'status'" class="field-value">
                                <span class="status-badge" :class="statusMeta(profile).className">
                                    {{ statusMeta(profile).text }}
                                </span>
                            </span>

                            <span v-else class="field-value">{{ field.value }}</span>
                        </div>
                    </div>
                </article>
            </div>
        </div>
    </div>
</template>

<style scoped>
@import '../../styles/panel-common.css';
@import '../../styles/dashboard-pages.css';

.header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.search-toolbar {
    margin-top: -6px;
}

.viewing-tag {
    font-size: 12px;
    color: #1d4ed8;
    background: #dbeafe;
    border: 1px solid #bfdbfe;
    border-radius: 999px;
    padding: 4px 10px;
}

.profile-shell {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.profile-hero {
    border: 1px solid #dbeafe;
    border-radius: 12px;
    background: linear-gradient(135deg, #f8fbff 0%, #eef6ff 100%);
    padding: 18px;
}

.hero-name {
    font-size: 24px;
    font-weight: 700;
    color: #1e293b;
}

.hero-sub {
    margin-top: 2px;
    color: #64748b;
    font-size: 13px;
}

.hero-meta {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #334155;
    font-size: 14px;
}

.profile-hero .status-badge {
    margin-top: 10px;
}

.profile-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}

.profile-section {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #fff;
    padding: 14px;
}

.section-title {
    margin: 0 0 10px;
    color: #1e293b;
    font-size: 15px;
}

.section-content {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.field-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.field-label {
    color: #64748b;
    font-size: 12px;
    font-weight: 500;
}

.field-value {
    color: #1e293b;
    font-size: 14px;
    word-break: break-word;
}

.field-row .input {
    width: 100%;
}

@media (max-width: 1024px) {
    .profile-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 768px) {
    .profile-grid {
        grid-template-columns: 1fr;
    }

    .header-actions {
        width: 100%;
    }

    .viewing-tag {
        width: fit-content;
    }
}
</style>
