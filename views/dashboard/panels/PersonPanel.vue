<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi } from '../../../apis';
import { useAuthStore } from '../../../src/stores/auth';
import { exportToExcel } from '../../../utils/excelExport';

const props = defineProps({
    role: { type: String, default: 'admin' },
});

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const list = ref([]);
const loading = ref(false);
const error = ref('');
const page = ref(1);
const pageSize = 10;

const showCreate = ref(false);
const savingCreate = ref(false);
const createForm = ref(createDefaultCreateForm());

const showDetail = ref(false);
const detailLoading = ref(false);
const detailError = ref('');
const detail = ref(null);

const detailDept = ref('');
const detailJob = ref('');
const detailState = ref(1);

const updatingDept = ref(false);
const updatingJob = ref(false);
const updatingState = ref(false);
const deleting = ref(false);

function createDefaultCreateForm() {
    return {
        name: '',
        emp_id: '',
        dpt_id: '',
        job: '',
    };
}

function isAdmin() {
    const role = String(props.role || '').toLowerCase();
    return role === 'admin' || role === 'superadmin';
}

function textOrEmpty(value) {
    return String(value ?? '').trim();
}

function displayValue(value) {
    return value === undefined || value === null || value === '' ? '-' : value;
}

function normalizeListPayload(payload) {
    if (Array.isArray(payload)) return payload;

    if (payload && typeof payload === 'object') {
        const candidates = [
            payload.list,
            payload.rows,
            payload.items,
            payload.records,
            payload.data,
        ];

        for (const candidate of candidates) {
            if (Array.isArray(candidate)) {
                return candidate;
            }
        }
    }

    return [];
}

function resolveDept(item) {
    return displayValue(item?.dept ?? item?.department ?? item?.dpt_name ?? item?.dpt_id);
}

function normalizeStateValue(item) {
    const raw = item?.state ?? item?.status;

    if (raw === 1 || raw === '1') return 1;
    if (raw === 0 || raw === '0') return 0;

    const normalized = String(raw ?? '')
        .trim()
        .toLowerCase();
    if (['在职', 'active', 'enabled'].includes(normalized)) return 1;
    if (['离职', 'inactive', 'disabled'].includes(normalized)) return 0;

    return -1;
}

function stateMeta(item) {
    const state = normalizeStateValue(item);

    if (state === 1) {
        return {
            className: 'success',
            text: t('dashboard.person.state.employed'),
        };
    }

    if (state === 0) {
        return {
            className: 'danger',
            text: t('dashboard.person.state.resigned'),
        };
    }

    return {
        className: '',
        text: t('dashboard.person.state.unknown'),
    };
}

function getDetailId() {
    return detail.value?.id;
}

function getDetailEmpId() {
    return textOrEmpty(detail.value?.emp_id);
}

function syncDetailFormValues() {
    detailDept.value = textOrEmpty(
        detail.value?.dept ?? detail.value?.department ?? detail.value?.dpt_name
    );
    detailJob.value = textOrEmpty(detail.value?.job);

    const normalizedState = normalizeStateValue(detail.value);
    detailState.value = normalizedState === -1 ? 1 : normalizedState;
}

function handleRequestError(err, fallbackKey, { silent = false } = {}) {
    const status = Number(err?.status ?? 0);
    const fallback = t(fallbackKey);
    const message = textOrEmpty(err?.message) || fallback;

    if (status === 401) {
        const authExpired = t('dashboard.person.errors.unauthorized');
        if (!silent) ElMessage.error(authExpired);
        authStore.clearToken();
        router.push('/');
        return authExpired;
    }

    if (status === 403) {
        const forbidden = t('dashboard.person.errors.forbidden');
        if (!silent) ElMessage.warning(forbidden);
        return forbidden;
    }

    if (!silent) {
        ElMessage.error(message);
    }

    return message;
}

async function fetchPersons() {
    loading.value = true;
    error.value = '';

    try {
        const params = {
            page: page.value,
            page_size: pageSize,
        };

        const result = await adminApi.getPersonList(undefined, params);
        list.value = normalizeListPayload(result);
    } catch (err) {
        list.value = [];
        error.value = handleRequestError(err, 'dashboard.person.loadFailed', { silent: true });
    } finally {
        loading.value = false;
    }
}

async function loadDetailById(id, { notifySuccess = false } = {}) {
    if (!id) return;

    detailLoading.value = true;
    detailError.value = '';

    try {
        const result = await adminApi.getPersonById(undefined, id);
        detail.value = result;
        syncDetailFormValues();

        if (notifySuccess) {
            ElMessage.success(t('dashboard.person.messages.detailRefreshed'));
        }
    } catch (err) {
        detailError.value = handleRequestError(err, 'dashboard.person.messages.detailFailed', {
            silent: true,
        });
    } finally {
        detailLoading.value = false;
    }
}

function openDetail(item) {
    showDetail.value = true;
    detail.value = item;
    syncDetailFormValues();
    loadDetailById(item?.id);
}

function openCreate() {
    createForm.value = createDefaultCreateForm();
    showCreate.value = true;
}

async function createPerson() {
    const name = textOrEmpty(createForm.value.name);
    const empId = textOrEmpty(createForm.value.emp_id);
    const dptId = textOrEmpty(createForm.value.dpt_id);
    const job = textOrEmpty(createForm.value.job);

    if (!name) {
        ElMessage.warning(t('dashboard.person.validation.nameRequired'));
        return;
    }

    if (dptId && Number.isNaN(Number(dptId))) {
        ElMessage.warning(t('dashboard.person.validation.departmentIdNumber'));
        return;
    }

    savingCreate.value = true;

    try {
        await adminApi.createPerson(undefined, {
            name,
            emp_id: empId || undefined,
            dpt_id: dptId ? Number(dptId) : 0,
            job,
        });

        showCreate.value = false;
        createForm.value = createDefaultCreateForm();
        ElMessage.success(t('dashboard.person.messages.createSuccess'));
        await fetchPersons();
    } catch (err) {
        handleRequestError(err, 'dashboard.person.messages.createFailed');
    } finally {
        savingCreate.value = false;
    }
}

async function refreshCurrentDetail() {
    const id = getDetailId();
    if (!id) return;
    await loadDetailById(id, { notifySuccess: true });
}

async function updateDetailDepartment() {
    const empId = getDetailEmpId();
    const dept = textOrEmpty(detailDept.value);

    if (!empId) {
        ElMessage.warning(t('dashboard.person.validation.empIdRequired'));
        return;
    }

    if (!dept) {
        ElMessage.warning(t('dashboard.person.validation.departmentRequired'));
        return;
    }

    updatingDept.value = true;

    try {
        await adminApi.changePersonDepartment(undefined, {
            emp_id: empId,
            dept,
        });
        ElMessage.success(t('dashboard.person.messages.updateSuccess'));
        await Promise.all([fetchPersons(), loadDetailById(getDetailId())]);
    } catch (err) {
        handleRequestError(err, 'dashboard.person.messages.updateFailed');
    } finally {
        updatingDept.value = false;
    }
}

async function updateDetailJob() {
    const empId = getDetailEmpId();
    const job = textOrEmpty(detailJob.value);

    if (!empId) {
        ElMessage.warning(t('dashboard.person.validation.empIdRequired'));
        return;
    }

    if (!job) {
        ElMessage.warning(t('dashboard.person.validation.jobRequired'));
        return;
    }

    updatingJob.value = true;

    try {
        await adminApi.changePersonJob(undefined, {
            emp_id: empId,
            job,
        });
        ElMessage.success(t('dashboard.person.messages.updateSuccess'));
        await Promise.all([fetchPersons(), loadDetailById(getDetailId())]);
    } catch (err) {
        handleRequestError(err, 'dashboard.person.messages.updateFailed');
    } finally {
        updatingJob.value = false;
    }
}

async function updateDetailState() {
    const empId = getDetailEmpId();

    if (!empId) {
        ElMessage.warning(t('dashboard.person.validation.empIdRequired'));
        return;
    }

    updatingState.value = true;

    try {
        await adminApi.changePersonState(undefined, {
            emp_id: empId,
            state: Number(detailState.value),
        });
        ElMessage.success(t('dashboard.person.messages.updateSuccess'));
        await Promise.all([fetchPersons(), loadDetailById(getDetailId())]);
    } catch (err) {
        handleRequestError(err, 'dashboard.person.messages.updateFailed');
    } finally {
        updatingState.value = false;
    }
}

async function deleteCurrentEmployee() {
    const id = getDetailId();

    if (!id) {
        ElMessage.warning(t('dashboard.person.validation.detailMissing'));
        return;
    }

    const employeeName = textOrEmpty(detail.value?.name || detail.value?.emp_id || id);

    try {
        await ElMessageBox.confirm(
            t('dashboard.person.confirm.deleteMessage', { name: employeeName }),
            t('dashboard.person.confirm.deleteTitle'),
            {
                confirmButtonText: t('dashboard.person.actions.confirmDelete'),
                cancelButtonText: t('dashboard.common.cancel'),
                type: 'warning',
            }
        );
    } catch {
        return;
    }

    deleting.value = true;

    try {
        await adminApi.deletePersonById(undefined, id);
        ElMessage.success(t('dashboard.person.messages.deleteSuccess'));
        showDetail.value = false;
        detail.value = null;
        await fetchPersons();
    } catch (err) {
        handleRequestError(err, 'dashboard.person.messages.deleteFailed');
    } finally {
        deleting.value = false;
    }
}

function prevPage() {
    if (page.value > 1) {
        page.value -= 1;
        fetchPersons();
    }
}

function nextPage() {
    if (list.value.length >= pageSize) {
        page.value += 1;
        fetchPersons();
    }
}

function exportPersons() {
    if (list.value.length === 0) {
        ElMessage.warning(t('dashboard.common.exportNoData'));
        return;
    }

    try {
        exportToExcel({
            fileName: `persons_page_${page.value}`,
            sheetName: t('dashboard.nav.person'),
            rows: list.value,
            columns: [
                { key: 'id', label: t('dashboard.person.table.id') },
                {
                    key: 'emp_id',
                    label: t('dashboard.person.table.empId'),
                    formatter: (row) => displayValue(row.emp_id),
                },
                {
                    key: 'name',
                    label: t('dashboard.person.table.name'),
                    formatter: (row) => displayValue(row.name),
                },
                {
                    key: 'dept',
                    label: t('dashboard.person.table.department'),
                    formatter: (row) => resolveDept(row),
                },
                {
                    key: 'job',
                    label: t('dashboard.person.table.job'),
                    formatter: (row) => displayValue(row.job),
                },
                {
                    key: 'state',
                    label: t('dashboard.person.table.state'),
                    formatter: (row) => stateMeta(row).text,
                },
            ],
        });
        ElMessage.success(t('dashboard.common.exportSuccess'));
    } catch (err) {
        ElMessage.error(err?.message || t('dashboard.common.exportFailed'));
    }
}

onMounted(() => {
    if (isAdmin()) {
        fetchPersons();
    }
});
</script>

<template>
    <div class="panel">
        <div class="panel-header">
            <div>
                <h2 class="panel-title">{{ t('dashboard.nav.person') }}</h2>
                <p class="panel-sub">{{ t('dashboard.person.sub') }}</p>
            </div>
            <div v-if="isAdmin()" class="header-actions">
                <button class="btn btn-primary" @click="openCreate">
                    + {{ t('dashboard.person.actions.create') }}
                </button>
                <button class="btn btn-secondary" @click="exportPersons">
                    {{ t('dashboard.common.exportExcel') }}
                </button>
            </div>
        </div>

        <div v-if="!isAdmin()" class="tip">{{ t('dashboard.person.noAccess') }}</div>

        <template v-else>
            <div v-if="loading" class="tip">{{ t('dashboard.loading') }}</div>
            <div v-else-if="error" class="tip error">{{ error }}</div>
            <div v-else-if="list.length === 0" class="tip">{{ t('dashboard.common.noData') }}</div>
            <div v-else class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>{{ t('dashboard.person.table.id') }}</th>
                            <th>{{ t('dashboard.person.table.empId') }}</th>
                            <th>{{ t('dashboard.person.table.name') }}</th>
                            <th>{{ t('dashboard.person.table.department') }}</th>
                            <th>{{ t('dashboard.person.table.job') }}</th>
                            <th>{{ t('dashboard.person.table.state') }}</th>
                            <th>{{ t('dashboard.person.table.actions') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in list" :key="item.id">
                            <td>{{ item.id }}</td>
                            <td>{{ displayValue(item.emp_id) }}</td>
                            <td>{{ displayValue(item.name) }}</td>
                            <td>{{ resolveDept(item) }}</td>
                            <td>{{ displayValue(item.job) }}</td>
                            <td>
                                <span class="status-badge" :class="stateMeta(item).className">
                                    {{ stateMeta(item).text }}
                                </span>
                            </td>
                            <td>
                                <button class="btn-link" @click="openDetail(item)">
                                    {{ t('dashboard.person.actions.viewDetail') }}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div v-if="!loading && !error" class="pagination">
                <button :disabled="page <= 1" class="btn btn-ghost" @click="prevPage">
                    {{ t('dashboard.common.prevPage') }}
                </button>
                <span class="page-info">{{ t('dashboard.common.pageN', { page }) }}</span>
                <button :disabled="list.length < pageSize" class="btn btn-ghost" @click="nextPage">
                    {{ t('dashboard.common.nextPage') }}
                </button>
            </div>
        </template>

        <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
            <div class="modal-box">
                <h3 class="modal-title">{{ t('dashboard.person.createTitle') }}</h3>

                <div class="form-row">
                    <label>{{ t('dashboard.person.form.name') }}</label>
                    <input
                        v-model="createForm.name"
                        class="input"
                        :placeholder="t('dashboard.person.placeholder.name')"
                    />
                </div>

                <div class="form-row">
                    <label>{{ t('dashboard.person.form.empId') }}</label>
                    <input
                        v-model="createForm.emp_id"
                        class="input"
                        :placeholder="t('dashboard.person.placeholder.empId')"
                    />
                </div>

                <div class="form-row">
                    <label>{{ t('dashboard.person.form.departmentId') }}</label>
                    <input
                        v-model="createForm.dpt_id"
                        class="input"
                        :placeholder="t('dashboard.person.placeholder.departmentId')"
                    />
                </div>

                <div class="form-row">
                    <label>{{ t('dashboard.person.form.job') }}</label>
                    <input
                        v-model="createForm.job"
                        class="input"
                        :placeholder="t('dashboard.person.placeholder.job')"
                    />
                </div>

                <div class="modal-actions">
                    <button class="btn btn-ghost" @click="showCreate = false">
                        {{ t('dashboard.common.cancel') }}
                    </button>
                    <button :disabled="savingCreate" class="btn btn-primary" @click="createPerson">
                        {{
                            savingCreate
                                ? t('dashboard.person.messages.creating')
                                : t('dashboard.person.actions.create')
                        }}
                    </button>
                </div>
            </div>
        </div>

        <div v-if="showDetail" class="drawer-overlay" @click.self="showDetail = false">
            <aside class="detail-drawer">
                <div class="drawer-header">
                    <div>
                        <h3 class="modal-title">
                            {{
                                t('dashboard.person.detailTitle', {
                                    name: detail?.name || detail?.emp_id || '-',
                                })
                            }}
                        </h3>
                        <p class="panel-sub">{{ t('dashboard.person.detailSub') }}</p>
                    </div>
                    <div class="drawer-header-actions">
                        <button
                            :disabled="detailLoading"
                            class="btn btn-secondary"
                            @click="refreshCurrentDetail"
                        >
                            {{ t('dashboard.person.actions.refreshDetail') }}
                        </button>
                        <button class="btn btn-ghost btn-close" @click="showDetail = false">
                            x
                        </button>
                    </div>
                </div>

                <div class="drawer-content">
                    <div v-if="detailLoading" class="tip">{{ t('dashboard.loading') }}</div>
                    <div v-else>
                        <div v-if="detailError" class="tip error detail-error">
                            {{ detailError }}
                        </div>

                        <div v-if="detail" class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-label">{{
                                    t('dashboard.person.table.id')
                                }}</span>
                                <span class="detail-value">{{ displayValue(detail.id) }}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">{{
                                    t('dashboard.person.table.empId')
                                }}</span>
                                <span class="detail-value">{{ displayValue(detail.emp_id) }}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">{{
                                    t('dashboard.person.table.name')
                                }}</span>
                                <span class="detail-value">{{ displayValue(detail.name) }}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">{{
                                    t('dashboard.person.table.department')
                                }}</span>
                                <span class="detail-value">{{ resolveDept(detail) }}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">{{
                                    t('dashboard.person.table.job')
                                }}</span>
                                <span class="detail-value">{{ displayValue(detail.job) }}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">{{
                                    t('dashboard.person.table.state')
                                }}</span>
                                <span class="detail-value">
                                    <span class="status-badge" :class="stateMeta(detail).className">
                                        {{ stateMeta(detail).text }}
                                    </span>
                                </span>
                            </div>
                        </div>

                        <section class="action-section">
                            <h4 class="section-title">
                                {{ t('dashboard.person.sections.updateDepartment') }}
                            </h4>
                            <div class="form-inline">
                                <input
                                    v-model="detailDept"
                                    class="input"
                                    :placeholder="t('dashboard.person.placeholder.department')"
                                />
                                <button
                                    :disabled="updatingDept"
                                    class="btn btn-primary"
                                    @click="updateDetailDepartment"
                                >
                                    {{
                                        updatingDept
                                            ? t('dashboard.person.messages.updating')
                                            : t('dashboard.person.actions.update')
                                    }}
                                </button>
                            </div>
                        </section>

                        <section class="action-section">
                            <h4 class="section-title">
                                {{ t('dashboard.person.sections.updateJob') }}
                            </h4>
                            <div class="form-inline">
                                <input
                                    v-model="detailJob"
                                    class="input"
                                    :placeholder="t('dashboard.person.placeholder.job')"
                                />
                                <button
                                    :disabled="updatingJob"
                                    class="btn btn-primary"
                                    @click="updateDetailJob"
                                >
                                    {{
                                        updatingJob
                                            ? t('dashboard.person.messages.updating')
                                            : t('dashboard.person.actions.update')
                                    }}
                                </button>
                            </div>
                        </section>

                        <section class="action-section">
                            <h4 class="section-title">
                                {{ t('dashboard.person.sections.updateState') }}
                            </h4>
                            <div class="form-inline">
                                <select v-model.number="detailState" class="input">
                                    <option :value="1">
                                        {{ t('dashboard.person.state.employed') }} (1)
                                    </option>
                                    <option :value="0">
                                        {{ t('dashboard.person.state.resigned') }} (0)
                                    </option>
                                </select>
                                <button
                                    :disabled="updatingState"
                                    class="btn btn-primary"
                                    @click="updateDetailState"
                                >
                                    {{
                                        updatingState
                                            ? t('dashboard.person.messages.updating')
                                            : t('dashboard.person.actions.update')
                                    }}
                                </button>
                            </div>
                        </section>

                        <section class="action-section danger-section">
                            <h4 class="section-title">
                                {{ t('dashboard.person.sections.danger') }}
                            </h4>
                            <p class="text-muted danger-desc">
                                {{ t('dashboard.person.dangerHint') }}
                            </p>
                            <button
                                :disabled="deleting"
                                class="btn btn-danger"
                                @click="deleteCurrentEmployee"
                            >
                                {{
                                    deleting
                                        ? t('dashboard.person.messages.deleting')
                                        : t('dashboard.person.actions.delete')
                                }}
                            </button>
                        </section>
                    </div>
                </div>
            </aside>
        </div>
    </div>
</template>

<style scoped>
@import '../../styles/panel-common.css';

.header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.36);
    display: flex;
    justify-content: flex-end;
    z-index: 120;
}

.detail-drawer {
    width: min(560px, 96vw);
    height: 100vh;
    background: #fff;
    border-left: 1px solid #e2e8f0;
    box-shadow: -12px 0 36px rgba(2, 6, 23, 0.18);
    display: flex;
    flex-direction: column;
}

.drawer-header {
    padding: 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.drawer-header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.btn-close {
    min-width: 34px;
    width: 34px;
    padding: 0;
    line-height: 32px;
    text-align: center;
}

.drawer-content {
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px 20px;
}

.detail-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 14px;
}

.detail-item {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px;
    background: #f8fafc;
}

.detail-label {
    display: block;
    color: #64748b;
    font-size: 12px;
    margin-bottom: 4px;
}

.detail-value {
    color: #1e293b;
    font-size: 14px;
}

.action-section {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
}

.section-title {
    margin: 0 0 10px;
    font-size: 14px;
    color: #1e293b;
}

.form-inline {
    display: flex;
    align-items: center;
    gap: 10px;
}

.form-inline .input {
    flex: 1;
}

.danger-section {
    border-color: #fecaca;
    background: #fff7f7;
}

.danger-desc {
    margin: 0 0 10px;
}

.detail-error {
    padding: 0 0 10px;
}

@media (max-width: 768px) {
    .header-actions {
        width: 100%;
    }

    .detail-grid {
        grid-template-columns: 1fr;
    }

    .form-inline {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>
