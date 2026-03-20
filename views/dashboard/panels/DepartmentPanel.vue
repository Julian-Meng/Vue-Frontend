<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminApi } from '../../../apis'

defineProps({
  role: { type: String, default: 'admin' },
})
const { t } = useI18n()

const departments = ref([])
const loading     = ref(false)
const error       = ref('')
const keyword     = ref('')
const page        = ref(1)
const pageSize    = 10

const showModal   = ref(false)
const editTarget  = ref(null)
const form        = ref({ name: '', description: '', full_num: 20 })
const saving      = ref(false)

async function fetchDepartments() {
  loading.value     = true
  error.value       = ''
  try {
    const params = { page: page.value, page_size: pageSize }
    if (keyword.value) params.name = keyword.value
    departments.value = await adminApi.getDepartmentList(undefined, params)
    if (!Array.isArray(departments.value)) departments.value = []
  } catch (e) {
    error.value       = e?.message || t('dashboard.department.loadFailed')
    departments.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editTarget.value = null
  form.value       = { name: '', description: '', full_num: 20 }
  showModal.value  = true
}

function openEdit(item) {
  editTarget.value = item
  form.value       = {
    name: item.name ?? '',
    description: item.description ?? '',
    full_num: Number(item.full_num ?? item.max_people ?? 20),
  }
  showModal.value  = true
}

async function saveDept() {
  if (!form.value.name.trim()) return alert('请填写部门名称')
  saving.value = true
  try {
    if (editTarget.value) {
      await adminApi.updateDepartment(undefined, editTarget.value.id, form.value)
    } else {
      await adminApi.createDepartment(undefined, form.value)
    }
    showModal.value = false
    await fetchDepartments()
  } catch (e) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function deleteDept(id) {
  if (!confirm('确认删除该部门？')) return
  try {
    await adminApi.deleteDepartment(undefined, id)
    await fetchDepartments()
  } catch (e) {
    alert(e?.message || '删除失败')
  }
}

function prevPage() { if (page.value > 1) { page.value--; fetchDepartments() } }
function nextPage() { if (departments.value.length >= pageSize) { page.value++; fetchDepartments() } }

onMounted(fetchDepartments)
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <h2 class="panel-title">{{ t('dashboard.nav.department') }}</h2>
        <p class="panel-sub">{{ t('dashboard.department.sub') }}</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">+ {{ t('dashboard.department.create') }}</button>
    </div>

    <div class="toolbar">
      <input v-model="keyword" class="input" placeholder="部门名称筛选" @keyup.enter="() => { page = 1; fetchDepartments() }" />
      <button class="btn btn-primary" @click="() => { page = 1; fetchDepartments() }">{{ t('dashboard.common.query') }}</button>
      <button class="btn btn-ghost" @click="() => { keyword = ''; page = 1; fetchDepartments() }">{{ t('dashboard.common.reset') }}</button>
    </div>

    <div v-if="loading" class="tip">{{ t('dashboard.loading') }}</div>
    <div v-else-if="error" class="tip error">{{ error }}</div>
    <div v-else-if="departments.length === 0" class="tip">{{ t('dashboard.common.noData') }}</div>
    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>部门名称</th>
            <th>描述</th>
            <th>人数上限</th>
            <th>负责人</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in departments" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ item.name }}</td>
            <td>{{ item.description ?? '—' }}</td>
            <td>{{ item.full_num ?? item.max_people ?? '—' }}</td>
            <td>{{ item.manager ?? item.manager_name ?? '—' }}</td>
            <td>{{ item.created_at ?? item.create_time ?? '—' }}</td>
            <td>
              <button class="btn-link" @click="openEdit(item)">编辑</button>
              <button class="btn-link danger" @click="deleteDept(item.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && !error" class="pagination">
      <button :disabled="page <= 1" class="btn btn-ghost" @click="prevPage">{{ t('dashboard.common.prevPage') }}</button>
      <span class="page-info">{{ t('dashboard.common.pageN', { page }) }}</span>
      <button :disabled="departments.length < pageSize" class="btn btn-ghost" @click="nextPage">{{ t('dashboard.common.nextPage') }}</button>
    </div>

    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-box">
        <h3 class="modal-title">{{ editTarget ? t('dashboard.department.edit') : t('dashboard.department.create') }}</h3>
        <div class="form-row">
          <label>部门名称</label>
          <input v-model="form.name" class="input" placeholder="请输入部门名称" />
        </div>
        <div class="form-row">
          <label>描述</label>
          <input v-model="form.description" class="input" placeholder="可选，部门描述" />
        </div>
        <div class="form-row">
          <label>人数上限</label>
          <input v-model.number="form.full_num" class="input" type="number" min="1" placeholder="默认20" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showModal = false">{{ t('dashboard.common.cancel') }}</button>
          <button :disabled="saving" class="btn btn-primary" @click="saveDept">
            {{ saving ? t('dashboard.department.saving') : t('dashboard.common.save') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../../styles/panel-common.css';
</style>
