<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '../../../apis'

const props = defineProps({
  role: { type: String, default: 'admin' },
})

const { t } = useI18n()
const isAdmin = () => props.role === 'admin'

const list = ref([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const pageSize = 10

const detailId = ref('')
const detail = ref(null)
const detailLoading = ref(false)

const createForm = ref({ name: '', emp_id: '', dpt_id: '', job: '' })
const savingCreate = ref(false)

const changeDeptForm = ref({ emp_id: '', dept: '' })
const changeStateForm = ref({ emp_id: '', state: 1 })
const changeJobForm = ref({ emp_id: '', job: '' })
const updating = ref(false)

const deleteId = ref('')
const deleteEmpId = ref('')

async function fetchPersons() {
  loading.value = true
  error.value = ''
  try {
    const params = {
      page: page.value,
      page_size: pageSize,
    }
    const result = await adminApi.getPersonList(undefined, params)
    list.value = Array.isArray(result) ? result : []
  } catch (e) {
    error.value = e?.message || t('dashboard.person.loadFailed')
    list.value = []
  } finally {
    loading.value = false
  }
}

async function fetchPersonDetail() {
  if (!detailId.value.trim()) return
  detailLoading.value = true
  try {
    detail.value = await adminApi.getPersonById(undefined, detailId.value.trim())
  } catch (e) {
    detail.value = { error: e?.message || '查询失败' }
  } finally {
    detailLoading.value = false
  }
}

async function createPerson() {
  if (!createForm.value.name.trim()) {
    ElMessage.warning('请填写姓名')
    return
  }
  savingCreate.value = true
  try {
    await adminApi.createPerson(undefined, {
      name: createForm.value.name,
      emp_id: createForm.value.emp_id || undefined,
      dpt_id: createForm.value.dpt_id ? Number(createForm.value.dpt_id) : 0,
      job: createForm.value.job,
    })
    createForm.value = { name: '', emp_id: '', dpt_id: '', job: '' }
    ElMessage.success('创建成功')
    await fetchPersons()
  } catch (e) {
    ElMessage.error(e?.message || '创建失败')
  } finally {
    savingCreate.value = false
  }
}

async function submitChangeDept() {
  if (!changeDeptForm.value.emp_id.trim()) {
    ElMessage.warning('请输入工号')
    return
  }
  updating.value = true
  try {
    await adminApi.changePersonDepartment(undefined, {
      emp_id: changeDeptForm.value.emp_id.trim(),
      dept: changeDeptForm.value.dept,
    })
    ElMessage.success('修改成功')
    await fetchPersons()
  } catch (e) {
    ElMessage.error(e?.message || '修改失败')
  } finally {
    updating.value = false
  }
}

async function submitChangeState() {
  if (!changeStateForm.value.emp_id.trim()) {
    ElMessage.warning('请输入工号')
    return
  }
  updating.value = true
  try {
    await adminApi.changePersonState(undefined, {
      emp_id: changeStateForm.value.emp_id.trim(),
      state: Number(changeStateForm.value.state),
    })
    ElMessage.success('修改成功')
    await fetchPersons()
  } catch (e) {
    ElMessage.error(e?.message || '修改失败')
  } finally {
    updating.value = false
  }
}

async function submitChangeJob() {
  if (!changeJobForm.value.emp_id.trim()) {
    ElMessage.warning('请输入工号')
    return
  }
  updating.value = true
  try {
    await adminApi.changePersonJob(undefined, {
      emp_id: changeJobForm.value.emp_id.trim(),
      job: changeJobForm.value.job,
    })
    ElMessage.success('修改成功')
    await fetchPersons()
  } catch (e) {
    ElMessage.error(e?.message || '修改失败')
  } finally {
    updating.value = false
  }
}

async function deleteById() {
  if (!deleteId.value.trim()) return
  try {
    await ElMessageBox.confirm('确认按 ID 删除员工？', '确认操作', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await adminApi.deletePersonById(undefined, deleteId.value.trim())
    deleteId.value = ''
    ElMessage.success('删除成功')
    await fetchPersons()
  } catch (e) {
    ElMessage.error(e?.message || '删除失败')
  }
}

async function deleteByEmpId() {
  if (!deleteEmpId.value.trim()) return
  try {
    await ElMessageBox.confirm('确认按工号删除员工？', '确认操作', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await adminApi.deletePersonByEmpId(undefined, deleteEmpId.value.trim())
    deleteEmpId.value = ''
    ElMessage.success('删除成功')
    await fetchPersons()
  } catch (e) {
    ElMessage.error(e?.message || '删除失败')
  }
}

function prevPage() { if (page.value > 1) { page.value -= 1; fetchPersons() } }
function nextPage() { if (list.value.length >= pageSize) { page.value += 1; fetchPersons() } }

onMounted(() => {
  if (isAdmin()) fetchPersons()
})
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <h2 class="panel-title">{{ t('dashboard.nav.person') }}</h2>
        <p class="panel-sub">{{ t('dashboard.person.sub') }}</p>
      </div>
    </div>

    <div v-if="!isAdmin()" class="tip">仅管理员可查看员工管理。</div>

    <template v-else>
      <div class="toolbar">
        <input v-model="detailId" class="input" placeholder="员工 ID" />
        <button :disabled="detailLoading" class="btn btn-primary" @click="fetchPersonDetail">查询详情</button>
        <input v-model="deleteId" class="input" placeholder="按 ID 删除" />
        <button class="btn btn-ghost" @click="deleteById">删除</button>
        <input v-model="deleteEmpId" class="input" placeholder="按工号删除" />
        <button class="btn btn-ghost" @click="deleteByEmpId">删除</button>
      </div>

      <div v-if="detail" class="raw-wrap" style="margin-top: 0; margin-bottom: 16px;">
        <h3 class="raw-title">员工详情</h3>
        <pre class="raw-content">{{ JSON.stringify(detail, null, 2) }}</pre>
      </div>

      <div class="toolbar">
        <input v-model="createForm.name" class="input" placeholder="姓名" />
        <input v-model="createForm.emp_id" class="input" placeholder="工号(可选)" />
        <input v-model="createForm.dpt_id" class="input" placeholder="部门 ID" />
        <input v-model="createForm.job" class="input" placeholder="岗位" />
        <button :disabled="savingCreate" class="btn btn-primary" @click="createPerson">创建</button>
      </div>

      <div class="toolbar">
        <input v-model="changeDeptForm.emp_id" class="input" placeholder="工号" />
        <input v-model="changeDeptForm.dept" class="input" placeholder="新部门名" />
        <button :disabled="updating" class="btn btn-ghost" @click="submitChangeDept">改部门</button>
      </div>

      <div class="toolbar">
        <input v-model="changeStateForm.emp_id" class="input" placeholder="工号" />
        <select v-model.number="changeStateForm.state" class="input">
          <option :value="1">在职(1)</option>
          <option :value="0">离职(0)</option>
        </select>
        <button :disabled="updating" class="btn btn-ghost" @click="submitChangeState">改状态</button>
      </div>

      <div class="toolbar">
        <input v-model="changeJobForm.emp_id" class="input" placeholder="工号" />
        <input v-model="changeJobForm.job" class="input" placeholder="新职位" />
        <button :disabled="updating" class="btn btn-ghost" @click="submitChangeJob">改职位</button>
      </div>

      <div v-if="loading" class="tip">{{ t('dashboard.loading') }}</div>
      <div v-else-if="error" class="tip error">{{ error }}</div>
      <div v-else-if="list.length === 0" class="tip">{{ t('dashboard.common.noData') }}</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>工号</th>
              <th>姓名</th>
              <th>部门</th>
              <th>岗位</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>{{ item.id }}</td>
              <td>{{ item.emp_id ?? '—' }}</td>
              <td>{{ item.name ?? '—' }}</td>
              <td>{{ item.dept ?? item.department ?? item.dpt_id ?? '—' }}</td>
              <td>{{ item.job ?? '—' }}</td>
              <td>{{ item.state ?? item.status ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!loading && !error" class="pagination">
        <button :disabled="page <= 1" class="btn btn-ghost" @click="prevPage">{{ t('dashboard.common.prevPage') }}</button>
        <span class="page-info">{{ t('dashboard.common.pageN', { page }) }}</span>
        <button :disabled="list.length < pageSize" class="btn btn-ghost" @click="nextPage">{{ t('dashboard.common.nextPage') }}</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
@import '../../styles/panel-common.css';
</style>
