<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { ElMessage } from 'element-plus';
import { userApi, adminApi } from '../../../apis';

const props = defineProps({
    role: { type: String, default: 'user' },
});
const { t } = useI18n();

const isAdmin = () => props.role === 'admin';

const profile = ref(null);
const loading = ref(false);
const error = ref('');

// 编辑
const editing = ref(false);
const form = ref({});
const saving = ref(false);

// 管理员：按员工ID查档案
const empId = ref('');
const searching = ref(false);

async function loadMyProfile() {
    loading.value = true;
    error.value = '';
    try {
        profile.value = await userApi.getMyProfile();
        form.value = { ...profile.value };
    } catch (e) {
        error.value = e?.message || t('dashboard.profile.loadFailed');
    } finally {
        loading.value = false;
    }
}

async function searchProfile() {
    if (!empId.value.trim()) {
        ElMessage.warning('请输入员工工号');
        return;
    }
    searching.value = true;
    error.value = '';
    try {
        profile.value = await adminApi.getPersonProfile(undefined, empId.value.trim());
        form.value = { ...profile.value };
    } catch (e) {
        error.value = e?.message || '未找到该员工';
        profile.value = null;
    } finally {
        searching.value = false;
    }
}

async function saveProfile() {
    saving.value = true;
    try {
        const id = profile.value?.id ?? profile.value?.user_id;
        if (!id) throw new Error('无法获取用户 ID');
        await userApi.updateUserProfileById(undefined, id, form.value);
        profile.value = { ...profile.value, ...form.value };
        editing.value = false;
        ElMessage.success('保存成功');
    } catch (e) {
        ElMessage.error(e?.message || '保存失败');
    } finally {
        saving.value = false;
    }
}

const FIELD_LABELS = {
    id: 'ID',
    user_id: '用户ID',
    emp_id: '员工工号',
    name: '姓名',
    gender: '性别',
    phone: '手机号',
    email: '邮箱',
    department: '部门',
    position: '职位',
    hire_date: '入职日期',
    status: '状态',
    address: '住址',
};

const profileFields = () => {
    if (!profile.value) return [];
    return Object.entries(profile.value)
        .filter(([k]) => k !== 'password')
        .map(([key, value]) => ({
            key,
            label: FIELD_LABELS[key] ?? key,
            value: value ?? '—',
        }));
};

const editableKeys = ['name', 'phone', 'email', 'address'];

onMounted(() => {
    if (!isAdmin()) loadMyProfile();
});
</script>

<template>
    <div class="panel">
        <h2 class="panel-title">{{ t('dashboard.nav.profile') }}</h2>

        <!-- 管理员：通过工号查询 -->
        <div v-if="isAdmin()" class="toolbar" style="margin-bottom: 20px">
            <input
                v-model="empId"
                class="input"
                placeholder="输入员工工号查询档案"
                @keyup.enter="searchProfile"
            />
            <button :disabled="searching" class="btn btn-primary" @click="searchProfile">
                {{ searching ? t('dashboard.profile.searching') : t('dashboard.common.query') }}
            </button>
        </div>

        <div v-if="loading" class="tip">{{ t('dashboard.loading') }}</div>
        <div v-else-if="error" class="tip error">{{ error }}</div>
        <div v-else-if="!profile" class="tip">
            {{ isAdmin() ? t('dashboard.profile.searchHint') : t('dashboard.common.noData') }}
        </div>

        <div v-else class="profile-card">
            <div class="profile-fields">
                <div v-for="field in profileFields()" :key="field.key" class="field-row">
                    <span class="field-label">{{ field.label }}</span>
                    <template v-if="editing && editableKeys.includes(field.key)">
                        <input v-model="form[field.key]" class="input" />
                    </template>
                    <span v-else class="field-value">{{ field.value }}</span>
                </div>
            </div>

            <div v-if="!isAdmin()" class="profile-actions">
                <template v-if="!editing">
                    <button class="btn btn-primary" @click="editing = true">编辑资料</button>
                </template>
                <template v-else>
                    <button :disabled="saving" class="btn btn-primary" @click="saveProfile">
                        {{ saving ? t('dashboard.profile.saving') : t('dashboard.common.save') }}
                    </button>
                    <button
                        class="btn btn-ghost"
                        @click="
                            editing = false;
                            form = { ...profile };
                        "
                    >
                        {{ t('dashboard.common.cancel') }}
                    </button>
                </template>
            </div>
        </div>
    </div>
</template>

<style scoped>
@import '../../styles/panel-common.css';

.profile-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 24px;
    max-width: 600px;
}

.profile-fields {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
}

.field-row {
    display: flex;
    align-items: center;
    gap: 16px;
}

.field-label {
    width: 90px;
    flex-shrink: 0;
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
}

.field-value {
    font-size: 14px;
    color: #1e293b;
}

.field-row .input {
    flex: 1;
}

.profile-actions {
    display: flex;
    gap: 10px;
    padding-top: 4px;
    border-top: 1px solid #f1f5f9;
}
</style>
