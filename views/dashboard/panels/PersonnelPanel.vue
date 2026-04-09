<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { adminApi, userApi } from '../../../apis';
import { useAuthStore } from '../../../src/stores/auth';
import { exportToExcel } from '../../../utils/excelExport';

const props = defineProps({
    role: { type: String, default: 'user' },
});

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const page = ref(1);
const pageSize = 10;
const list = ref([]);
const loading = ref(false);
const error = ref('');

const showApprove = ref(false);
const approveTarget = ref(null);
const approving = ref(false);
const approveForm = ref(createDefaultApproveForm());

const showCreate = ref(false);
const creating = ref(false);
const createForm = ref(createDefaultCreateForm());
const endDateInvalid = ref(false);

const showDetail = ref(false);
const detailLoading = ref(false);
const detailError = ref('');
const detailTarget = ref(null);

const isCreateLeaveType = computed(() => Number(createForm.value.change_type) === 4);

function isAdmin() {
    const role = String(props.role || '').toLowerCase();
    return role === 'admin' || role === 'superadmin';
}

function createDefaultApproveForm() {
    return { action: 'approve', approver: '', reject_reason: '' };
}

function createDefaultCreateForm() {
    return {
        change_type: 1,
        target_dpt: '',
        description: '',
        leave_start_at: '',
        leave_end_at: '',
        leave_reason: '',
        leave_type: '',
        handover_note: '',
    };
}

function textOrEmpty(value) {
    return String(value ?? '').trim();
}

function displayValue(value) {
    if (value === undefined || value === null || value === '') {
        return '-';
    }
    return value;
}

function clearLeaveFields() {
    createForm.value.leave_start_at = '';
    createForm.value.leave_end_at = '';
    createForm.value.leave_reason = '';
    createForm.value.leave_type = '';
    createForm.value.handover_note = '';
}

function resetCreateForm() {
    createForm.value = createDefaultCreateForm();
    endDateInvalid.value = false;
}

function resetApproveForm() {
    approveForm.value = createDefaultApproveForm();
}

function normalizeListPayload(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

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

function normalizeStatus(item) {
    const rawStatus = item?.status ?? item?.state;

    if (rawStatus === 0 || rawStatus === '0') return 'pending';
    if (rawStatus === 1 || rawStatus === '1') return 'approved';
    if (rawStatus === 2 || rawStatus === '2') return 'rejected';

    const lowered = String(rawStatus ?? '').trim().toLowerCase();

    if (['pending', 'wait', 'waiting', '待审批', '待审核'].includes(lowered)) {
        return 'pending';
    }
    if (['approve', 'approved', 'success', '通过', '批准', '已通过'].includes(lowered)) {
        return 'approved';
    }
    if (['reject', 'rejected', 'deny', '拒绝', '驳回', '已驳回'].includes(lowered)) {
        return 'rejected';
    }

    return '';
}

function statusMeta(item) {
    const normalized = normalizeStatus(item);

    if (normalized === 'pending') {
        return {
            className: 'pending',
            text: t('dashboard.personnel.status.pending'),
        };
    }
    if (normalized === 'approved') {
        return {
            className: 'approved',
            text: t('dashboard.personnel.status.approved'),
        };
    }
    if (normalized === 'rejected') {
        return {
            className: 'rejected',
            text: t('dashboard.personnel.status.rejected'),
        };
    }

    return {
        className: '',
        text: String(item?.status ?? item?.state ?? t('dashboard.personnel.status.unknown')),
    };
}

function isPending(item) {
    return normalizeStatus(item) === 'pending';
}

function normalizeChangeType(item) {
    const rawType = item?.change_type ?? item?.type;

    if (rawType === 1 || rawType === '1') return 1;
    if (rawType === 2 || rawType === '2') return 2;
    if (rawType === 3 || rawType === '3') return 3;
    if (rawType === 4 || rawType === '4') return 4;

    const lowered = String(rawType ?? '').trim().toLowerCase();

    if (['调部门', 'department'].includes(lowered)) return 1;
    if (['调岗', 'post', 'position'].includes(lowered)) return 2;
    if (['离职', 'resign', 'resignation'].includes(lowered)) return 3;
    if (['请假', 'leave'].includes(lowered)) return 4;

    return 0;
}

function changeTypeText(item) {
    const changeType = normalizeChangeType(item);
    if (changeType === 1) return t('dashboard.personnel.type.department');
    if (changeType === 2) return t('dashboard.personnel.type.position');
    if (changeType === 3) return t('dashboard.personnel.type.resign');
    if (changeType === 4) return t('dashboard.personnel.type.leave');

    return displayValue(item?.change_type ?? item?.type);
}

function isLeaveRecord(item) {
    return normalizeChangeType(item) === 4;
}

function leaveRangeText(item) {
    if (!isLeaveRecord(item)) {
        return '-';
    }

    const start = textOrEmpty(item?.leave_start_at);
    const end = textOrEmpty(item?.leave_end_at);

    if (!start && !end) {
        return '-';
    }

    return `${start || '-'} ~ ${end || '-'}`;
}

function resolveCreatedAt(item) {
    return item?.create_at ?? item?.created_at ?? item?.apply_time ?? '-';
}

function normalizeEndDateValidation() {
    if (!isCreateLeaveType.value) {
        endDateInvalid.value = false;
        return;
    }

    const start = textOrEmpty(createForm.value.leave_start_at);
    const end = textOrEmpty(createForm.value.leave_end_at);

    endDateInvalid.value = Boolean(start && end && end < start);
}

function handleRequestError(err, fallbackKey, { silent = false } = {}) {
    const status = Number(err?.status ?? 0);
    const message = textOrEmpty(err?.message) || t(fallbackKey);

    if (status === 401) {
        const authExpired = t('dashboard.personnel.errors.unauthorized');
        if (!silent) ElMessage.error(authExpired);
        authStore.clearToken();
        router.push('/');
        return authExpired;
    }

    if (status === 403) {
        const forbidden = t('dashboard.personnel.errors.forbidden');
        if (!silent) ElMessage.warning(forbidden);
        return forbidden;
    }

    if (status === 400 && message.includes('当前登录账号未绑定员工工号')) {
        const noEmpBinding = t('dashboard.personnel.errors.noEmpBinding');
        if (!silent) ElMessage.warning(noEmpBinding);
        return noEmpBinding;
    }

    if (status === 400 && /leave_(start|end)_at/.test(message)) {
        const dateFormatInvalid = t('dashboard.personnel.errors.leaveDateFormat');
        if (!silent) ElMessage.warning(dateFormatInvalid);
        return dateFormatInvalid;
    }

    if (status === 400 && message.includes('请假结束日期不能早于开始日期')) {
        endDateInvalid.value = true;
        const invalidRange = t('dashboard.personnel.errors.leaveEndEarlier');
        if (!silent) ElMessage.warning(invalidRange);
        return invalidRange;
    }

    if (!silent) {
        ElMessage.error(message);
    }

    return message;
}

async function fetchList() {
    loading.value = true;
    error.value = '';

    try {
        if (!isAdmin()) {
            list.value = [];
            return;
        }

        const params = { page: page.value, page_size: pageSize };
        const response = await adminApi.getPersonnelList(undefined, params);
        list.value = normalizeListPayload(response);
    } catch (err) {
        error.value = handleRequestError(err, 'dashboard.personnel.loadFailed', { silent: true });
        list.value = [];
    } finally {
        loading.value = false;
    }
}

function openCreate() {
    resetCreateForm();
    showCreate.value = true;
}

function openApprove(item) {
    approveTarget.value = item;
    resetApproveForm();
    showApprove.value = true;
}

async function openDetail(item) {
    showDetail.value = true;
    detailLoading.value = true;
    detailError.value = '';
    detailTarget.value = item;

    try {
        const detail = await adminApi.getPersonnelById(undefined, item.id);
        if (detail && typeof detail === 'object') {
            detailTarget.value = detail;
        }
    } catch (err) {
        detailError.value = handleRequestError(err, 'dashboard.personnel.messages.detailFailed', {
            silent: true,
        });
    } finally {
        detailLoading.value = false;
    }
}

function validateCreateForm() {
    const changeType = Number(createForm.value.change_type);

    if (![1, 2, 3, 4].includes(changeType)) {
        ElMessage.warning(t('dashboard.personnel.validation.changeTypeInvalid'));
        return false;
    }

    if (changeType === 1) {
        const targetDept = textOrEmpty(createForm.value.target_dpt);
        if (!targetDept) {
            ElMessage.warning(t('dashboard.personnel.validation.targetDeptRequired'));
            return false;
        }

        if (Number.isNaN(Number(targetDept))) {
            ElMessage.warning(t('dashboard.personnel.validation.targetDeptNumber'));
            return false;
        }
    }

    if (changeType === 4) {
        const leaveStart = textOrEmpty(createForm.value.leave_start_at);
        const leaveEnd = textOrEmpty(createForm.value.leave_end_at);
        const leaveReason = textOrEmpty(createForm.value.leave_reason);

        if (!leaveStart) {
            ElMessage.warning(t('dashboard.personnel.validation.leaveStartRequired'));
            return false;
        }
        if (!leaveEnd) {
            ElMessage.warning(t('dashboard.personnel.validation.leaveEndRequired'));
            return false;
        }
        if (!leaveReason) {
            ElMessage.warning(t('dashboard.personnel.validation.leaveReasonRequired'));
            return false;
        }

        if (leaveEnd < leaveStart) {
            endDateInvalid.value = true;
            ElMessage.warning(t('dashboard.personnel.errors.leaveEndEarlier'));
            return false;
        }
    }

    return true;
}

function buildCreatePayload() {
    const changeType = Number(createForm.value.change_type);
    const payload = {
        change_type: changeType,
    };

    const description = textOrEmpty(createForm.value.description);
    if (description && changeType !== 4) {
        payload.description = description;
    }

    if (changeType === 1) {
        payload.target_dpt = Number(textOrEmpty(createForm.value.target_dpt));
    }

    if (changeType === 4) {
        payload.leave_start_at = textOrEmpty(createForm.value.leave_start_at);
        payload.leave_end_at = textOrEmpty(createForm.value.leave_end_at);
        payload.leave_reason = textOrEmpty(createForm.value.leave_reason);

        const leaveType = textOrEmpty(createForm.value.leave_type);
        const handoverNote = textOrEmpty(createForm.value.handover_note);

        if (leaveType) payload.leave_type = leaveType;
        if (handoverNote) payload.handover_note = handoverNote;
    }

    return payload;
}

async function submitCreate() {
    endDateInvalid.value = false;

    if (!validateCreateForm()) {
        return;
    }

    creating.value = true;

    try {
        const payload = buildCreatePayload();

        if (isAdmin()) {
            await adminApi.createPersonnel(undefined, payload);
        } else {
            await userApi.createChangeRequest(undefined, payload);
        }

        showCreate.value = false;
        resetCreateForm();
        ElMessage.success(t('dashboard.personnel.messages.createSuccess'));

        if (isAdmin()) {
            await fetchList();
        }
    } catch (err) {
        handleRequestError(err, 'dashboard.personnel.messages.createFailed');
    } finally {
        creating.value = false;
    }
}

async function submitApprove() {
    if (!approveTarget.value?.id) {
        ElMessage.warning(t('dashboard.personnel.validation.approveTargetMissing'));
        return;
    }

    const shouldReject = approveForm.value.action === 'reject';
    const rejectReason = textOrEmpty(approveForm.value.reject_reason);

    if (shouldReject && !rejectReason) {
        ElMessage.warning(t('dashboard.personnel.validation.rejectReasonRequired'));
        return;
    }

    approving.value = true;

    try {
        const payload = {
            id: approveTarget.value.id,
            approver: textOrEmpty(approveForm.value.approver) || 'admin',
            approve: !shouldReject,
        };

        if (shouldReject) {
            payload.reject_reason = rejectReason;
        }

        await adminApi.approvePersonnel(undefined, payload);
        showApprove.value = false;
        resetApproveForm();
        ElMessage.success(t('dashboard.personnel.messages.approveSuccess'));
        await fetchList();
    } catch (err) {
        handleRequestError(err, 'dashboard.personnel.messages.approveFailed');
    } finally {
        approving.value = false;
    }
}

function prevPage() {
    if (page.value > 1) {
        page.value -= 1;
        fetchList();
    }
}

function nextPage() {
    if (list.value.length >= pageSize) {
        page.value += 1;
        fetchList();
    }
}

function exportPersonnel() {
    if (!isAdmin() || list.value.length === 0) {
        ElMessage.warning(t('dashboard.common.exportNoData'));
        return;
    }

    try {
        exportToExcel({
            fileName: `personnel_page_${page.value}`,
            sheetName: t('dashboard.nav.personnel'),
            rows: list.value,
            columns: [
                { key: 'id', label: t('dashboard.personnel.table.id') },
                {
                    key: 'employee_name',
                    label: t('dashboard.personnel.table.employee'),
                    formatter: (row) => displayValue(row.employee_name ?? row.emp_id),
                },
                {
                    key: 'change_type',
                    label: t('dashboard.personnel.table.changeType'),
                    formatter: (row) => changeTypeText(row),
                },
                {
                    key: 'target_dpt',
                    label: t('dashboard.personnel.table.targetDept'),
                    formatter: (row) => displayValue(row.target_dpt ?? row.new_dept),
                },
                {
                    key: 'leave_range',
                    label: t('dashboard.personnel.table.leaveRange'),
                    formatter: (row) => leaveRangeText(row),
                },
                {
                    key: 'leave_reason',
                    label: t('dashboard.personnel.table.leaveReason'),
                    formatter: (row) => displayValue(row.leave_reason),
                },
                {
                    key: 'status',
                    label: t('dashboard.personnel.table.status'),
                    formatter: (row) => statusMeta(row).text,
                },
                {
                    key: 'reject_reason',
                    label: t('dashboard.personnel.table.rejectReason'),
                    formatter: (row) => displayValue(row.reject_reason),
                },
                {
                    key: 'created_at',
                    label: t('dashboard.personnel.table.createdAt'),
                    formatter: (row) => resolveCreatedAt(row),
                },
            ],
        });
        ElMessage.success(t('dashboard.common.exportSuccess'));
    } catch (err) {
        ElMessage.error(err?.message || t('dashboard.common.exportFailed'));
    }
}

watch(
    () => createForm.value.change_type,
    (nextType) => {
        if (Number(nextType) !== 4) {
            clearLeaveFields();
        } else {
            createForm.value.description = '';
        }
        if (Number(nextType) !== 1) {
            createForm.value.target_dpt = '';
        }
        endDateInvalid.value = false;
    }
);

watch(
    () => [createForm.value.leave_start_at, createForm.value.leave_end_at],
    () => {
        normalizeEndDateValidation();
    }
);

onMounted(fetchList);
</script>

<template>
    <div class="panel">
        <div class="panel-header">
            <div>
                <h2 class="panel-title">{{ t('dashboard.nav.personnel') }}</h2>
                <p class="panel-sub">
                    {{
                        isAdmin()
                            ? t('dashboard.personnel.adminSub')
                            : t('dashboard.personnel.userSub')
                    }}
                </p>
            </div>
            <div class="header-actions">
                <button class="btn btn-primary" @click="openCreate">
                    + {{ t('dashboard.personnel.submit') }}
                </button>
                <button v-if="isAdmin()" class="btn btn-secondary" @click="exportPersonnel">
                    {{ t('dashboard.common.exportExcel') }}
                </button>
            </div>
        </div>

        <template v-if="isAdmin()">
            <div v-if="loading" class="tip">{{ t('dashboard.loading') }}</div>
            <div v-else-if="error" class="tip error">{{ error }}</div>
            <div v-else-if="list.length === 0" class="tip">{{ t('dashboard.common.noData') }}</div>
            <div v-else class="table-wrap">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>{{ t('dashboard.personnel.table.id') }}</th>
                            <th>{{ t('dashboard.personnel.table.employee') }}</th>
                            <th>{{ t('dashboard.personnel.table.changeType') }}</th>
                            <th>{{ t('dashboard.personnel.table.targetDept') }}</th>
                            <th>{{ t('dashboard.personnel.table.leaveRange') }}</th>
                            <th>{{ t('dashboard.personnel.table.leaveReason') }}</th>
                            <th>{{ t('dashboard.personnel.table.status') }}</th>
                            <th>{{ t('dashboard.personnel.table.rejectReason') }}</th>
                            <th>{{ t('dashboard.personnel.table.createdAt') }}</th>
                            <th>{{ t('dashboard.personnel.table.actions') }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in list" :key="item.id">
                            <td>{{ item.id }}</td>
                            <td>{{ displayValue(item.employee_name ?? item.emp_id) }}</td>
                            <td>{{ changeTypeText(item) }}</td>
                            <td>{{ displayValue(item.target_dpt ?? item.new_dept) }}</td>
                            <td>{{ leaveRangeText(item) }}</td>
                            <td>{{ displayValue(item.leave_reason) }}</td>
                            <td>
                                <span class="status-badge" :class="statusMeta(item).className">
                                    {{ statusMeta(item).text }}
                                </span>
                            </td>
                            <td class="cell-truncate">{{ displayValue(item.reject_reason) }}</td>
                            <td>{{ resolveCreatedAt(item) }}</td>
                            <td>
                                <button class="btn-link" @click="openDetail(item)">
                                    {{ t('dashboard.personnel.actions.viewDetail') }}
                                </button>
                                <button
                                    v-if="isPending(item)"
                                    class="btn-link"
                                    @click="openApprove(item)"
                                >
                                    {{ t('dashboard.personnel.actions.approve') }}
                                </button>
                                <span v-else class="text-muted">-</span>
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

        <template v-else>
            <p class="text-muted user-tip">{{ t('dashboard.personnel.userHint') }}</p>
        </template>

        <div v-if="showApprove" class="modal-overlay" @click.self="showApprove = false">
            <div class="modal-box">
                <h3 class="modal-title">
                    {{ t('dashboard.personnel.approveTitle', { id: approveTarget?.id || '-' }) }}
                </h3>
                <div class="form-row">
                    <label>{{ t('dashboard.personnel.form.action') }}</label>
                    <select v-model="approveForm.action" class="input">
                        <option value="approve">{{ t('dashboard.personnel.actions.approve') }}</option>
                        <option value="reject">{{ t('dashboard.personnel.actions.reject') }}</option>
                    </select>
                </div>
                <div class="form-row">
                    <label>{{ t('dashboard.personnel.form.approver') }}</label>
                    <input
                        v-model="approveForm.approver"
                        class="input"
                        :placeholder="t('dashboard.personnel.placeholder.approver')"
                    />
                </div>
                <div v-if="approveForm.action === 'reject'" class="form-row">
                    <label>{{ t('dashboard.personnel.form.rejectReason') }}</label>
                    <textarea
                        v-model="approveForm.reject_reason"
                        class="input"
                        rows="3"
                        :placeholder="t('dashboard.personnel.placeholder.rejectReason')"
                    />
                </div>
                <div class="modal-actions">
                    <button class="btn btn-ghost" @click="showApprove = false">
                        {{ t('dashboard.common.cancel') }}
                    </button>
                    <button :disabled="approving" class="btn btn-primary" @click="submitApprove">
                        {{
                            approving
                                ? t('dashboard.personnel.messages.approving')
                                : t('dashboard.personnel.actions.confirm')
                        }}
                    </button>
                </div>
            </div>
        </div>

        <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
            <div class="modal-box create-modal">
                <h3 class="modal-title">{{ t('dashboard.personnel.createTitle') }}</h3>

                <div class="form-row">
                    <label>{{ t('dashboard.personnel.form.changeType') }}</label>
                    <select v-model.number="createForm.change_type" class="input">
                        <option :value="1">{{ t('dashboard.personnel.type.department') }}</option>
                        <option :value="2">{{ t('dashboard.personnel.type.position') }}</option>
                        <option :value="3">{{ t('dashboard.personnel.type.resign') }}</option>
                        <option :value="4">{{ t('dashboard.personnel.type.leave') }}</option>
                    </select>
                </div>

                <div v-if="Number(createForm.change_type) === 1" class="form-row">
                    <label>{{ t('dashboard.personnel.form.targetDept') }}</label>
                    <input
                        v-model="createForm.target_dpt"
                        class="input"
                        :placeholder="t('dashboard.personnel.placeholder.targetDept')"
                    />
                </div>

                <div v-if="!isCreateLeaveType" class="form-row">
                    <label>{{ t('dashboard.personnel.form.description') }}</label>
                    <textarea
                        v-model="createForm.description"
                        class="input"
                        rows="3"
                        :placeholder="t('dashboard.personnel.placeholder.description')"
                    />
                </div>

                <div v-if="isCreateLeaveType" class="leave-fields">
                    <p class="text-info leave-tip">{{ t('dashboard.personnel.leaveTip') }}</p>

                    <div class="leave-grid">
                        <div class="form-row">
                            <label>{{ t('dashboard.personnel.form.leaveStart') }}</label>
                            <input v-model="createForm.leave_start_at" class="input" type="date" />
                        </div>

                        <div class="form-row">
                            <label>{{ t('dashboard.personnel.form.leaveEnd') }}</label>
                            <input
                                v-model="createForm.leave_end_at"
                                class="input"
                                :class="{ 'is-invalid': endDateInvalid }"
                                type="date"
                            />
                            <p v-if="endDateInvalid" class="inline-error">
                                {{ t('dashboard.personnel.errors.leaveEndEarlier') }}
                            </p>
                        </div>
                    </div>

                    <div class="form-row">
                        <label>{{ t('dashboard.personnel.form.leaveReason') }}</label>
                        <textarea
                            v-model="createForm.leave_reason"
                            class="input"
                            rows="3"
                            :placeholder="t('dashboard.personnel.placeholder.leaveReason')"
                        />
                    </div>

                    <div class="form-row">
                        <label>{{ t('dashboard.personnel.form.leaveType') }}</label>
                        <input
                            v-model="createForm.leave_type"
                            class="input"
                            :placeholder="t('dashboard.personnel.placeholder.leaveType')"
                        />
                    </div>

                    <div class="form-row">
                        <label>{{ t('dashboard.personnel.form.handoverNote') }}</label>
                        <textarea
                            v-model="createForm.handover_note"
                            class="input"
                            rows="2"
                            :placeholder="t('dashboard.personnel.placeholder.handoverNote')"
                        />
                    </div>
                </div>

                <div class="modal-actions">
                    <button class="btn btn-ghost" @click="showCreate = false">
                        {{ t('dashboard.common.cancel') }}
                    </button>
                    <button :disabled="creating" class="btn btn-primary" @click="submitCreate">
                        {{
                            creating
                                ? t('dashboard.personnel.messages.creating')
                                : t('dashboard.personnel.submit')
                        }}
                    </button>
                </div>
            </div>
        </div>

        <div v-if="showDetail" class="modal-overlay" @click.self="showDetail = false">
            <div class="modal-box detail-modal">
                <h3 class="modal-title">
                    {{ t('dashboard.personnel.detailTitle', { id: detailTarget?.id || '-' }) }}
                </h3>
                <div v-if="detailLoading" class="tip">{{ t('dashboard.loading') }}</div>
                <div v-else>
                    <p v-if="detailError" class="tip error detail-error">{{ detailError }}</p>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <span class="detail-label">{{ t('dashboard.personnel.table.employee') }}</span>
                            <span class="detail-value">{{ displayValue(detailTarget?.employee_name ?? detailTarget?.emp_id) }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t('dashboard.personnel.table.changeType') }}</span>
                            <span class="detail-value">{{ changeTypeText(detailTarget || {}) }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t('dashboard.personnel.table.targetDept') }}</span>
                            <span class="detail-value">{{ displayValue(detailTarget?.target_dpt ?? detailTarget?.new_dept) }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t('dashboard.personnel.table.status') }}</span>
                            <span class="detail-value">{{ statusMeta(detailTarget || {}).text }}</span>
                        </div>
                        <div class="detail-item detail-item-wide">
                            <span class="detail-label">{{ t('dashboard.personnel.table.description') }}</span>
                            <span class="detail-value">{{ displayValue(detailTarget?.description) }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t('dashboard.personnel.form.leaveStart') }}</span>
                            <span class="detail-value">{{ displayValue(detailTarget?.leave_start_at) }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t('dashboard.personnel.form.leaveEnd') }}</span>
                            <span class="detail-value">{{ displayValue(detailTarget?.leave_end_at) }}</span>
                        </div>
                        <div class="detail-item detail-item-wide">
                            <span class="detail-label">{{ t('dashboard.personnel.form.leaveReason') }}</span>
                            <span class="detail-value">{{ displayValue(detailTarget?.leave_reason) }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">{{ t('dashboard.personnel.form.leaveType') }}</span>
                            <span class="detail-value">{{ displayValue(detailTarget?.leave_type) }}</span>
                        </div>
                        <div class="detail-item detail-item-wide">
                            <span class="detail-label">{{ t('dashboard.personnel.form.handoverNote') }}</span>
                            <span class="detail-value">{{ displayValue(detailTarget?.handover_note) }}</span>
                        </div>
                        <div class="detail-item detail-item-wide">
                            <span class="detail-label">{{ t('dashboard.personnel.table.rejectReason') }}</span>
                            <span class="detail-value">{{ displayValue(detailTarget?.reject_reason) }}</span>
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" @click="showDetail = false">
                        {{ t('dashboard.personnel.actions.close') }}
                    </button>
                </div>
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

.user-tip {
    margin-top: 8px;
}

.cell-truncate {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.create-modal,
.detail-modal {
    max-width: 620px;
}

.create-modal {
    max-height: calc(100vh - 40px);
    overflow-y: auto;
}

.create-modal .modal-actions {
    position: sticky;
    bottom: -2px;
    background: #fff;
    border-top: 1px solid #e2e8f0;
    padding-top: 12px;
    margin-top: 16px;
}

.leave-fields {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px;
    background: #f8fafc;
}

.leave-tip {
    margin: 0 0 12px;
}

.leave-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.input.is-invalid {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.inline-error {
    margin: 6px 0 0;
    color: #dc2626;
    font-size: 12px;
}

.detail-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.detail-item {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px;
    background: #fff;
}

.detail-item-wide {
    grid-column: 1 / -1;
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
    white-space: pre-wrap;
    word-break: break-word;
}

.detail-error {
    padding: 0 0 10px;
}

@media (max-width: 768px) {
    .create-modal {
        max-height: calc(100vh - 24px);
    }

    .leave-grid {
        grid-template-columns: 1fr;
    }

    .detail-grid {
        grid-template-columns: 1fr;
    }
}
</style>
