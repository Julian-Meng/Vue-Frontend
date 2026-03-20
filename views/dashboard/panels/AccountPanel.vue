<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminApi } from '../../../apis'

defineProps({
  role: { type: String, default: 'admin' },
})
const { t } = useI18n()

const accounts  = ref([])
const loading   = ref(false)
const error     = ref('')
const keyword   = ref('')
const page      = ref(1)
const pageSize  = 10

const showModal  = ref(false)
const editTarget = ref(null)
const form       = ref({ username: '', password: '', role: 'staff', status: 1 })
const saving     = ref(false)

async function fetchAccounts() {
  loading.value  = true
  error.value    = ''
  try {
    const params = { page: page.value, page_size: pageSize }
    if (keyword.value) params.username = keyword.value
    accounts.value = await adminApi.getAccountList(undefined, params)
    if (!Array.isArray(accounts.value)) accounts.value = []
  } catch (e) {
    error.value    = e?.message || t('dashboard.account.loadFailed')
    accounts.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editTarget.value = null
  form.value       = { username: '', password: '', role: 'staff', status: 1 }
  showModal.value  = true
}

function openEdit(item) {
  editTarget.value = item
  form.value       = {
    username: item.username ?? '',
    password: '',
    role: item.role ?? 'staff',
    status: Number(item.status ?? 1),
  }
  showModal.value  = true
}

async function saveAccount() {
  if (!form.value.username.trim()) return alert('请填写用户名')
  if (!editTarget.value && !form.value.password.trim()) return alert('新建账号请填写密码')
  saving.value = true
  try {
    const payload = {
      username: form.value.username,
      role: form.value.role,
      status: Number(form.value.status),
    }
    if (form.value.password) payload.password = form.value.password
    if (editTarget.value) {
      await adminApi.updateAccount(undefined, editTarget.value.id, payload)
    } else {
      await adminApi.createAccount(undefined, { ...payload, password: form.value.password })
    }
    showModal.value = false
    await fetchAccounts()
  } catch (e) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function deleteAccount(id) {
  if (!confirm('确认删除该账号？此操作不可恢复！')) return
  try {
    await adminApi.deleteAccount(undefined, id)
    await fetchAccounts()
  } catch (e) {
    alert(e?.message || '删除失败')
  }
}

function prevPage() { if (page.value > 1) { page.value--; fetchAccounts() } }
function nextPage() { if (accounts.value.length >= pageSize) { page.value++; fetchAccounts() } }

function roleBadgeClass(roleName) {
  const normalized = String(roleName || '').toLowerCase()
  if (normalized === 'admin' || normalized === 'staff' || normalized === 'user') {
    return normalized
  }
  return 'user'
}

onMounted(fetchAccounts)
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <h2 class="panel-title">{{ t('dashboard.nav.account') }}</h2>
        <p class="panel-sub">{{ t('dashboard.account.sub') }}</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">+ {{ t('dashboard.account.create') }}</button>
    </div>

    <div class="toolbar">
      <input v-model="keyword" class="input" placeholder="用户名搜索" @keyup.enter="() => { page = 1; fetchAccounts() }" />
      <button class="btn btn-primary" @click="() => { page = 1; fetchAccounts() }">{{ t('dashboard.common.query') }}</button>
      <button class="btn btn-ghost" @click="() => { keyword = ''; page = 1; fetchAccounts() }">{{ t('dashboard.common.reset') }}</button>
    </div>

    <div v-if="loading" class="tip">{{ t('dashboard.loading') }}</div>
    <div v-else-if="error" class="tip error">{{ error }}</div>
    <div v-else-if="accounts.length === 0" class="tip">{{ t('dashboard.common.noData') }}</div>
    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用户名</th>
            <th>角色</th>
            <th>状态</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in accounts" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ item.username }}</td>
            <td>
              <span :class="['badge', roleBadgeClass(item.role)]">{{ item.role }}</span>
            </td>
            <td>{{ Number(item.status ?? 1) === 1 ? '启用' : '禁用' }}</td>
            <td>{{ item.created_at ?? item.create_time ?? '—' }}</td>
            <td>
              <button class="btn-link" @click="openEdit(item)">编辑</button>
              <button class="btn-link danger" @click="deleteAccount(item.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && !error" class="pagination">
      <button :disabled="page <= 1" class="btn btn-ghost" @click="prevPage">{{ t('dashboard.common.prevPage') }}</button>
      <span class="page-info">{{ t('dashboard.common.pageN', { page }) }}</span>
      <button :disabled="accounts.length < pageSize" class="btn btn-ghost" @click="nextPage">{{ t('dashboard.common.nextPage') }}</button>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-box">
        <h3 class="modal-title">{{ editTarget ? t('dashboard.account.edit') : t('dashboard.account.create') }}</h3>
        <div class="form-row">
          <label>用户名</label>
          <input v-model="form.username" class="input" placeholder="请输入用户名" :disabled="!!editTarget" />
        </div>
        <div class="form-row">
          <label>密码{{ editTarget ? '（留空则不修改）' : '' }}</label>
          <input v-model="form.password" class="input" type="password" placeholder="请输入密码" />
        </div>
        <div class="form-row">
          <label>角色</label>
          <select v-model="form.role" class="input">
            <option value="staff">普通用户 (staff)</option>
            <option value="admin">管理员 (admin)</option>
          </select>
        </div>
        <div class="form-row">
          <label>状态</label>
          <select v-model.number="form.status" class="input">
            <option :value="1">启用</option>
            <option :value="0">禁用</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showModal = false">{{ t('dashboard.common.cancel') }}</button>
          <button :disabled="saving" class="btn btn-primary" @click="saveAccount">
            {{ saving ? t('dashboard.account.saving') : t('dashboard.common.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../../styles/panel-common.css';
</style>
