<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminApi, userApi } from '../../../apis'

const props = defineProps({
  role: { type: String, default: 'user' },
})
const { t } = useI18n()

const isAdmin = () => props.role === 'admin'

const list      = ref([])
const loading   = ref(false)
const error     = ref('')
const page      = ref(1)
const pageSize  = 10

// 审批弹窗（管理员）
const showApprove  = ref(false)
const approveTarget = ref(null)
const approveForm  = ref({ action: 'approve', approver: '', remark: '' })
const approving    = ref(false)

// 新建申请弹窗（用户）
const showCreate  = ref(false)
const createForm  = ref({ change_type: '', reason: '', old_dept: '', new_dept: '' })
const creating    = ref(false)

async function fetchList() {
  loading.value = true
  error.value   = ''
  try {
    const params = { page: page.value, page_size: pageSize }
    list.value = isAdmin()
      ? await adminApi.getPersonnelList(undefined, params)
      : []
    if (!Array.isArray(list.value)) list.value = []
  } catch (e) {
    error.value = e?.message || t('dashboard.personnel.loadFailed')
    list.value  = []
  } finally {
    loading.value = false
  }
}

function openApprove(item) {
  approveTarget.value = item
  approveForm.value   = { action: 'approve', approver: '', remark: '' }
  showApprove.value   = true
}

async function submitApprove() {
  approving.value = true
  try {
    const payload = {
      id:     approveTarget.value.id,
      approver: approveForm.value.approver || 'admin',
      approve: approveForm.value.action === 'approve',
    }
    if (approveForm.value.remark?.trim()) payload.remark = approveForm.value.remark.trim()
    await adminApi.approvePersonnel(undefined, payload)
    showApprove.value = false
    await fetchList()
  } catch (e) {
    alert(e?.message || '操作失败')
  } finally {
    approving.value = false
  }
}

async function submitCreate() {
  if (!createForm.value.change_type.trim()) return alert('请填写变更类型')
  creating.value = true
  try {
    await userApi.createChangeRequest(undefined, createForm.value)
    showCreate.value = false
    alert('申请已提交')
  } catch (e) {
    alert(e?.message || '提交失败')
  } finally {
    creating.value = false
  }
}

function prevPage() { if (page.value > 1) { page.value--; fetchList() } }
function nextPage() { if (list.value.length >= pageSize) { page.value++; fetchList() } }

onMounted(fetchList)
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <h2 class="panel-title">{{ t('dashboard.nav.personnel') }}</h2>
        <p class="panel-sub">{{ isAdmin() ? t('dashboard.personnel.adminSub') : t('dashboard.personnel.userSub') }}</p>
      </div>
      <button v-if="!isAdmin()" class="btn btn-primary" @click="showCreate = true">+ {{ t('dashboard.personnel.submit') }}</button>
    </div>

    <template v-if="isAdmin()">
      <div v-if="loading" class="tip">{{ t('dashboard.loading') }}</div>
      <div v-else-if="error" class="tip error">{{ error }}</div>
      <div v-else-if="list.length === 0" class="tip">{{ t('dashboard.common.noData') }}</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>员工</th>
              <th>变更类型</th>
              <th>原部门</th>
              <th>新部门</th>
              <th>状态</th>
              <th>申请时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>{{ item.id }}</td>
              <td>{{ item.employee_name ?? item.emp_id ?? '—' }}</td>
              <td>{{ item.change_type ?? item.type ?? '—' }}</td>
              <td>{{ item.old_dept ?? item.old_department ?? '—' }}</td>
              <td>{{ item.new_dept ?? item.new_department ?? '—' }}</td>
              <td>
                <span class="status-badge" :class="item.status">{{ item.status ?? '—' }}</span>
              </td>
              <td>{{ item.created_at ?? item.apply_time ?? '—' }}</td>
              <td>
                <button
                  v-if="item.status === 'pending' || item.status === '待审批'"
                  class="btn-link"
                  @click="openApprove(item)"
                >审批</button>
                <span v-else class="text-muted">—</span>
              </td>
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

    <template v-else>
      <p class="text-muted" style="margin-top: 8px;">如需申请部门调动、岗位变更等，请点击「提交申请」按钮。</p>
    </template>

    <!-- 审批弹窗 -->
    <div v-if="showApprove" class="modal-overlay" @click.self="showApprove = false">
      <div class="modal-box">
        <h3 class="modal-title">审批申请 #{{ approveTarget?.id }}</h3>
        <div class="form-row">
          <label>操作</label>
          <select v-model="approveForm.action" class="input">
            <option value="approve">批准</option>
            <option value="reject">拒绝</option>
          </select>
        </div>
        <div class="form-row">
          <label>审批人</label>
          <input v-model="approveForm.approver" class="input" placeholder="如：admin" />
        </div>
        <div class="form-row">
          <label>备注</label>
          <input v-model="approveForm.remark" class="input" placeholder="可选" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showApprove = false">{{ t('dashboard.common.cancel') }}</button>
          <button :disabled="approving" class="btn btn-primary" @click="submitApprove">
            {{ approving ? '提交中...' : '确认' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 新建申请弹窗 -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal-box">
        <h3 class="modal-title">提交人事变更申请</h3>
        <div class="form-row">
          <label>变更类型</label>
          <input v-model="createForm.change_type" class="input" placeholder="如：部门调动、岗位变更" />
        </div>
        <div class="form-row">
          <label>原部门</label>
          <input v-model="createForm.old_dept" class="input" placeholder="可选" />
        </div>
        <div class="form-row">
          <label>新部门</label>
          <input v-model="createForm.new_dept" class="input" placeholder="可选" />
        </div>
        <div class="form-row">
          <label>原因说明</label>
          <textarea v-model="createForm.reason" class="input" rows="3" placeholder="请简述变更原因" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="showCreate = false">{{ t('dashboard.common.cancel') }}</button>
          <button :disabled="creating" class="btn btn-primary" @click="submitCreate">
            {{ creating ? '提交中...' : '提交' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import '../../styles/panel-common.css';
</style>
