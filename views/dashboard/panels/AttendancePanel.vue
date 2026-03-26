<script setup>
import { computed, ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage, ElMessageBox } from 'element-plus';
import { adminApi, userApi } from '../../../apis';

const props = defineProps({
    role: { type: String, default: 'user' },
});
const { t, locale } = useI18n();

const dateDisplayFormat = computed(() => t('dashboard.attendance.dateDisplayFormat'));

const isAdmin = () => props.role === 'admin';

// --- 数据 ---
const records = ref([]);
const loading = ref(false);
const error = ref('');
const startDate = ref('');
const endDate = ref('');
const searchEmpId = ref('');
const searchDeptId = ref('');

// --- 分页 ---
const page = ref(1);
const pageSize = 10;

// --- 编辑（管理员） ---
const editingRow = ref(null);
const editForm = ref({});
const saveLoading = ref(false);

// --- 打卡（普通用户） ---
const checkinLoading = ref(false);
const checkoutLoading = ref(false);
const checkinMsg = ref('');

async function fetchRecords() {
    loading.value = true;
    error.value = '';
    try {
        const params = {};
        if (startDate.value) params.start = startDate.value;
        if (endDate.value) params.end = endDate.value;
        params.page = page.value;
        params.page_size = pageSize;

        if (isAdmin()) {
            if (searchEmpId.value.trim()) params.emp_id = searchEmpId.value.trim();
            if (searchDeptId.value.trim()) params.dpt_id = searchDeptId.value.trim();
            records.value = await adminApi.searchAttendance(undefined, params);
        } else {
            records.value = await userApi.getMyAttendance(undefined, params);
        }
        if (!Array.isArray(records.value)) records.value = [];
    } catch (e) {
        error.value = e?.message || t('dashboard.attendance.loadFailed');
        records.value = [];
    } finally {
        loading.value = false;
    }
}

function startEdit(row) {
    editingRow.value = row.id;
    editForm.value = {
        check_in: row.check_in ?? '',
        check_out: row.check_out ?? '',
        status: row.status ?? '',
    };
}

function cancelEdit() {
    editingRow.value = null;
}

async function saveEdit(id) {
    saveLoading.value = true;
    try {
        await adminApi.updateAttendance(undefined, id, editForm.value);
        editingRow.value = null;
        ElMessage.success('保存成功');
        await fetchRecords();
    } catch (e) {
        ElMessage.error(e?.message || '保存失败');
    } finally {
        saveLoading.value = false;
    }
}

async function deleteRecord(id) {
    try {
        await ElMessageBox.confirm('确认删除该考勤记录？', '确认操作', {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            type: 'warning',
        });
    } catch {
        return;
    }

    try {
        await adminApi.deleteAttendance(undefined, id);
        ElMessage.success('删除成功');
        await fetchRecords();
    } catch (e) {
        ElMessage.error(e?.message || '删除失败');
    }
}

async function doCheckIn() {
    checkinLoading.value = true;
    checkinMsg.value = '';
    try {
        await userApi.checkIn(undefined, {});
        checkinMsg.value = '上班打卡成功';
        ElMessage.success('上班打卡成功');
        await fetchRecords();
    } catch (e) {
        const message = e?.message || '未知错误';
        checkinMsg.value = `打卡失败：${message}`;
        ElMessage.error(`打卡失败：${message}`);
    } finally {
        checkinLoading.value = false;
    }
}

async function doCheckOut() {
    checkoutLoading.value = true;
    checkinMsg.value = '';
    try {
        await userApi.checkOut(undefined, {});
        checkinMsg.value = '下班打卡成功';
        ElMessage.success('下班打卡成功');
        await fetchRecords();
    } catch (e) {
        const message = e?.message || '未知错误';
        checkinMsg.value = `打卡失败：${message}`;
        ElMessage.error(`打卡失败：${message}`);
    } finally {
        checkoutLoading.value = false;
    }
}

function prevPage() {
    if (page.value > 1) {
        page.value--;
        fetchRecords();
    }
}
function nextPage() {
    if (records.value.length >= pageSize) {
        page.value++;
        fetchRecords();
    }
}

onMounted(fetchRecords);
</script>

<template>
    <div class="panel">
        <div class="panel-header">
            <div>
                <h2 class="panel-title">{{ t('dashboard.nav.attendance') }}</h2>
                <p class="panel-sub">
                    {{
                        isAdmin()
                            ? t('dashboard.attendance.adminSub')
                            : t('dashboard.attendance.userSub')
                    }}
                </p>
            </div>
        </div>

        <!-- 用户打卡区 -->
        <div v-if="!isAdmin()" class="action-bar">
            <button :disabled="checkinLoading" class="btn btn-primary" @click="doCheckIn">
                {{
                    checkinLoading
                        ? t('dashboard.attendance.checking')
                        : t('dashboard.attendance.checkIn')
                }}
            </button>
            <button :disabled="checkoutLoading" class="btn btn-secondary" @click="doCheckOut">
                {{
                    checkoutLoading
                        ? t('dashboard.attendance.checking')
                        : t('dashboard.attendance.checkOut')
                }}
            </button>
            <span v-if="checkinMsg" class="action-bar-message">{{ checkinMsg }}</span>
        </div>

        <!-- 搜索栏 -->
        <div class="toolbar">
            <el-date-picker
                v-model="startDate"
                type="date"
                class="input"
                :placeholder="t('dashboard.attendance.startDate')"
                :format="dateDisplayFormat"
                value-format="YYYY-MM-DD"
                :key="`start-${locale}`"
            />
            <el-date-picker
                v-model="endDate"
                type="date"
                class="input"
                :placeholder="t('dashboard.attendance.endDate')"
                :format="dateDisplayFormat"
                value-format="YYYY-MM-DD"
                :key="`end-${locale}`"
            />
            <input
                v-if="isAdmin()"
                v-model="searchEmpId"
                class="input"
                placeholder="员工工号 (emp_id)"
            />
            <input
                v-if="isAdmin()"
                v-model="searchDeptId"
                class="input"
                placeholder="部门ID (dpt_id)"
            />
            <button
                class="btn btn-primary"
                @click="
                    () => {
                        page = 1;
                        fetchRecords();
                    }
                "
            >
                {{ t('dashboard.common.query') }}
            </button>
            <button
                class="btn btn-ghost"
                @click="
                    () => {
                        startDate = '';
                        endDate = '';
                        searchEmpId = '';
                        searchDeptId = '';
                        page = 1;
                        fetchRecords();
                    }
                "
            >
                {{ t('dashboard.common.reset') }}
            </button>
        </div>

        <div v-if="loading" class="tip">{{ t('dashboard.loading') }}</div>
        <div v-else-if="error" class="tip error">{{ error }}</div>
        <div v-else-if="records.length === 0" class="tip">{{ t('dashboard.common.noData') }}</div>
        <div v-else class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th v-if="isAdmin()">员工</th>
                        <th>日期</th>
                        <th>上班时间</th>
                        <th>下班时间</th>
                        <th>状态</th>
                        <th v-if="isAdmin()">操作</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in records" :key="row.id">
                        <td>{{ row.id }}</td>
                        <td v-if="isAdmin()">
                            {{ row.employee_name ?? row.emp_id ?? row.user_id ?? '—' }}
                        </td>
                        <td>{{ row.date ?? row.work_date ?? '—' }}</td>

                        <template v-if="isAdmin() && editingRow === row.id">
                            <td>
                                <input
                                    v-model="editForm.check_in"
                                    class="input-sm"
                                    type="text"
                                    placeholder="HH:MM"
                                />
                            </td>
                            <td>
                                <input
                                    v-model="editForm.check_out"
                                    class="input-sm"
                                    type="text"
                                    placeholder="HH:MM"
                                />
                            </td>
                            <td>
                                <input
                                    v-model="editForm.status"
                                    class="input-sm"
                                    type="text"
                                    placeholder="正常/迟到"
                                />
                            </td>
                            <td>
                                <button
                                    :disabled="saveLoading"
                                    class="btn-link"
                                    @click="saveEdit(row.id)"
                                >
                                    保存
                                </button>
                                <button class="btn-link danger" @click="cancelEdit">取消</button>
                            </td>
                        </template>
                        <template v-else>
                            <td>{{ row.check_in ?? row.checkin_time ?? '—' }}</td>
                            <td>{{ row.check_out ?? row.checkout_time ?? '—' }}</td>
                            <td>{{ row.status ?? '—' }}</td>
                            <td v-if="isAdmin()">
                                <button class="btn-link" @click="startEdit(row)">编辑</button>
                                <button class="btn-link danger" @click="deleteRecord(row.id)">
                                    删除
                                </button>
                            </td>
                        </template>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- 分页 -->
        <div v-if="!loading && !error" class="pagination">
            <button :disabled="page <= 1" class="btn btn-ghost" @click="prevPage">
                {{ t('dashboard.common.prevPage') }}
            </button>
            <span class="page-info">{{ t('dashboard.common.pageN', { page }) }}</span>
            <button :disabled="records.length < pageSize" class="btn btn-ghost" @click="nextPage">
                {{ t('dashboard.common.nextPage') }}
            </button>
        </div>
    </div>
</template>

<style scoped>
@import '../../styles/panel-common.css';
@import '../../styles/dashboard-pages.css';
</style>
