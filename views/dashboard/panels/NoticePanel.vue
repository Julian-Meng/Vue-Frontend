<script setup>
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getNoticeList, adminApi } from '../../../apis'
import { formatNoticeListForDashboard } from '../../../utils/noticeFormatter'

const props = defineProps({
  role: { type: String, default: 'user' },
})
const { t, locale } = useI18n()

const isAdmin = () => props.role === 'admin'

const notices    = ref([])
const loading    = ref(false)
const error      = ref('')
const page       = ref(1)
const pageSize   = 10

// 弹窗
const showModal  = ref(false)
const editTarget = ref(null) // null = 新建
const form       = ref({ title: '', content: '', publisher: '' })
const saving     = ref(false)

const formattedNotices = computed(() =>
  formatNoticeListForDashboard(notices.value, {
    locale: locale.value,
    maxContentLength: 120,
  }),
)

async function fetchNotices() {
  loading.value = true
  error.value   = ''
  try {
    const params = { page: page.value, page_size: pageSize }
    notices.value = await getNoticeList(params)
    if (!Array.isArray(notices.value)) notices.value = []
  } catch (e) {
    error.value   = e?.message || t('dashboard.notice.loadFailed')
    notices.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editTarget.value = null
  form.value = { title: '', content: '', publisher: '' }
  showModal.value  = true
}

function openEdit(item) {
  editTarget.value = item
  form.value = {
    title: item.title ?? '',
    content: item.content ?? '',
    publisher: item.publisher ?? '',
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function saveNotice() {
  if (!form.value.title.trim()) return alert('请填写标题')
  saving.value = true
  try {
    if (editTarget.value) {
      await adminApi.updateNotice(undefined, editTarget.value.id, form.value)
    } else {
      await adminApi.createNotice(undefined, form.value)
    }
    closeModal()
    await fetchNotices()
  } catch (e) {
    alert(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function deleteNotice(id) {
  if (!confirm('确认删除该公告？')) return
  try {
    await adminApi.deleteNotice(undefined, id)
    await fetchNotices()
  } catch (e) {
    alert(e?.message || '删除失败')
  }
}

function prevPage() { if (page.value > 1) { page.value--; fetchNotices() } }
function nextPage() { if (notices.value.length >= pageSize) { page.value++; fetchNotices() } }

onMounted(fetchNotices)
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <h2 class="panel-title">{{ t('dashboard.nav.notice') }}</h2>
        <p class="panel-sub">{{ t('dashboard.notice.sub') }}</p>
      </div>
      <button v-if="isAdmin()" class="btn btn-primary" @click="openCreate">+ {{ t('dashboard.notice.create') }}</button>
    </div>

    <div class="toolbar">
      <button class="btn btn-primary" @click="() => { page = 1; fetchNotices() }">{{ t('dashboard.common.query') }}</button>
    </div>

    <div v-if="loading" class="tip">{{ t('dashboard.loading') }}</div>
    <div v-else-if="error" class="tip error">{{ error }}</div>
    <div v-else-if="formattedNotices.length === 0" class="tip">{{ t('dashboard.common.noData') }}</div>
    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>内容摘要</th>
            <th>创建时间</th>
            <th v-if="isAdmin()">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in formattedNotices" :key="item.id || item.title">
            <td>{{ item.id }}</td>
            <td>{{ item.title }}</td>
            <td class="cell-truncate">{{ item.summary || item.content || '—' }}</td>
            <td>{{ item.createdAtText || '—' }}</td>
            <td v-if="isAdmin()">
              <button class="btn-link" @click="openEdit(item)">编辑</button>
              <button class="btn-link danger" @click="deleteNotice(item.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!loading && !error" class="pagination">
      <button :disabled="page <= 1" class="btn btn-ghost" @click="prevPage">{{ t('dashboard.common.prevPage') }}</button>
      <span class="page-info">{{ t('dashboard.common.pageN', { page }) }}</span>
      <button :disabled="formattedNotices.length < pageSize" class="btn btn-ghost" @click="nextPage">{{ t('dashboard.common.nextPage') }}</button>
    </div>

    <!-- 弹窗 -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-box">
        <h3 class="modal-title">{{ editTarget ? t('dashboard.notice.edit') : t('dashboard.notice.create') }}</h3>
        <div class="form-row">
          <label>标题</label>
          <input v-model="form.title" class="input" placeholder="请输入公告标题" />
        </div>
        <div class="form-row">
          <label>内容</label>
          <textarea v-model="form.content" class="input" rows="5" placeholder="请输入公告内容" />
        </div>
        <div class="form-row">
          <label>发布人</label>
          <input v-model="form.publisher" class="input" placeholder="可选，留空由后端处理" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="closeModal">{{ t('dashboard.common.cancel') }}</button>
          <button :disabled="saving" class="btn btn-primary" @click="saveNotice">
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
</style>
