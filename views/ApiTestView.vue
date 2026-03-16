<script setup>
import { computed, reactive, ref, watch } from 'vue'

import { adminApi, chatWithAI, getNoticeList, login, register, userApi } from '../apis'
import { getStoredToken, request } from '../apis/request'
import { useAuthStore } from '../src/stores/auth'

const authStore = useAuthStore()

const activeGroup = ref('session')
const loadingKey = ref('')
const lastActionTitle = ref('尚未执行请求')
const lastStatus = ref('idle')
const responseText = ref('等待执行接口请求...')
const errorMessage = ref('')
const manualToken = ref(authStore.token || getStoredToken())

// 当 Pinia store 里的 token 变更时（如登录成功、手动写入、清空等），自动同步到显示框。
// 这样即使 setToken 是在 onSuccess 里异步触发的，用户也能立刻看到更新后的 token。
watch(
  () => authStore.token,
  (newToken) => {
    manualToken.value = newToken
  },
)

const groupTabs = [
  { key: 'session', label: '登录与会话' },
  { key: 'public', label: '公共接口' },
  { key: 'admin', label: '管理员接口' },
  { key: 'user', label: '用户接口' },
]

function prettyPrint(value) {
  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function parseJsonText(text, fieldLabel) {
  const rawText = typeof text === 'string' ? text.trim() : ''

  if (!rawText) {
    return undefined
  }

  try {
    return JSON.parse(rawText)
  } catch (error) {
    throw new Error(`${fieldLabel} 不是有效的 JSON：${error.message}`)
  }
}

function buildErrorPayload(error) {
  return {
    message: error?.message || '请求失败',
    status: error?.status ?? null,
    businessCode: error?.businessCode ?? null,
    payload: error?.payload ?? null,
  }
}

function createOperation(config) {
  return {
    ...config,
    form: reactive({ ...config.initialForm }),
  }
}

function syncManualToken() {
  authStore.setToken(manualToken.value)
  manualToken.value = authStore.token
  lastActionTitle.value = '手动写入 Token'
  lastStatus.value = authStore.token ? 'success' : 'idle'
  errorMessage.value = ''
  responseText.value = prettyPrint({
    token: authStore.token,
    source: 'manual-input',
  })
}

function hydrateToken() {
  authStore.hydrateToken()
  manualToken.value = authStore.token
  lastActionTitle.value = '从 localStorage 恢复 Token'
  lastStatus.value = authStore.token ? 'success' : 'idle'
  errorMessage.value = ''
  responseText.value = prettyPrint({
    token: authStore.token,
    source: 'localStorage',
  })
}

function clearToken() {
  authStore.clearToken()
  manualToken.value = ''
  lastActionTitle.value = '清空 Token'
  lastStatus.value = 'idle'
  errorMessage.value = ''
  responseText.value = prettyPrint({
    token: '',
    source: 'clear-action',
  })
}

async function executeOperation(operation) {
  loadingKey.value = operation.key
  lastActionTitle.value = operation.title
  errorMessage.value = ''

  try {
    const result = await operation.execute(operation.form)

    if (typeof operation.onSuccess === 'function') {
      operation.onSuccess(result, operation.form)
    }

    manualToken.value = authStore.token
    lastStatus.value = 'success'
    responseText.value = prettyPrint(result)
  } catch (error) {
    lastStatus.value = 'error'
    errorMessage.value = error?.message || '请求失败'
    responseText.value = prettyPrint(buildErrorPayload(error))
  } finally {
    loadingKey.value = ''
  }
}

const operationGroups = [
  {
    key: 'session',
    title: '登录与会话工具',
    description: '优先测试登录、注册和 Token 状态。请求层会自动从 Pinia 和 localStorage 注入认证头。',
    operations: [
      createOperation({
        key: 'login',
        title: '登录',
        description: '调用 /api/login，成功后自动写入 Pinia 与 localStorage。',
        initialForm: {
          username: 'admin',
          password: '123456',
        },
        fields: [
          { key: 'username', label: '用户名', type: 'text', placeholder: '请输入用户名' },
          { key: 'password', label: '密码', type: 'password', placeholder: '请输入密码' },
        ],
        execute: (form) =>
          // 使用 unwrap: false 获取完整响应体以覆盖各种后端格式，同时在控制台展示
          // 完整的 { code, msg, data } 结构，方便调试时确认 token 字段位置。
          request({
            url: '/api/login',
            method: 'POST',
            withAuth: false,
            unwrap: false,
            data: {
              username: form.username,
              password: form.password,
            },
          }),
        onSuccess: (result) => {
          // 兼容多种后端响应格式，逐级尝试提取 token：
          // 格式 A: { code: 0, msg: "...", data: { token: "eyJ..." } }  ← 标准格式
          // 格式 B: { code: 0, msg: "...", token: "eyJ..." }            ← token 在顶层
          // 格式 C: { token: "eyJ..." }                                 ← 无 code/msg 包装
          // 格式 D: data 字段直接是 token 字符串
          const extractedToken =
            result?.data?.token ||
            result?.token ||
            (typeof result?.data === 'string' ? result.data : '') ||
            (typeof result === 'string' ? result : '')

          if (extractedToken) {
            authStore.setToken(extractedToken)
          }
        },
      }),
      createOperation({
        key: 'register',
        title: '注册',
        description: '调用 /api/register，方便快速造测试账号。',
        initialForm: {
          username: 'staff_demo',
          password: '123456',
          role: 'staff',
        },
        fields: [
          { key: 'username', label: '用户名', type: 'text', placeholder: '请输入用户名' },
          { key: 'password', label: '密码', type: 'password', placeholder: '请输入密码' },
          { key: 'role', label: '角色', type: 'text', placeholder: 'staff 或 admin' },
        ],
        execute: (form) =>
          register({
            username: form.username,
            password: form.password,
            role: form.role,
          }),
      }),
    ],
  },
  {
    key: 'public',
    title: '公共接口',
    description: '这些接口不会自动带认证头，适合在未登录状态下先验证后端连通性。',
    operations: [
      createOperation({
        key: 'notice-list',
        title: '获取公告列表',
        description: '调用 /api/notice，支持传入查询参数 JSON。',
        initialForm: {
          paramsText: '{\n  "page": 1,\n  "pageSize": 10\n}',
        },
        fields: [
          {
            key: 'paramsText',
            label: '查询参数 JSON',
            type: 'textarea',
            rows: 5,
            placeholder: '{\n  "page": 1\n}',
          },
        ],
        execute: (form) => getNoticeList(parseJsonText(form.paramsText, '公告查询参数')),
      }),
      createOperation({
        key: 'chat-ai',
        title: 'AI 聊天',
        description: '调用 /api/chat，便于快速验证 AI 服务联通。',
        initialForm: {
          dataText: '{\n  "message": "你好，请返回一段测试文本",\n  "session_id": "web-session"\n}',
        },
        fields: [
          {
            key: 'dataText',
            label: '请求体 JSON',
            type: 'textarea',
            rows: 6,
            placeholder: '{\n  "message": "你好"\n}',
          },
        ],
        execute: (form) => chatWithAI(parseJsonText(form.dataText, 'AI 聊天请求体')),
      }),
    ],
  },
  {
    key: 'admin',
    title: '管理员接口',
    description: '这里覆盖 dashboard、人员、部门、人事变更、账号、公告、档案与考勤的所有管理员接口。',
    operations: [
      createOperation({
        key: 'admin-dashboard',
        title: '管理员仪表盘',
        description: '获取管理员首页汇总数据。',
        initialForm: {},
        fields: [],
        execute: () => adminApi.getAdminDashboard(),
      }),
      createOperation({
        key: 'admin-ai-dashboard',
        title: '管理员 AI 分析',
        description: '获取管理员首页的 AI 分析结果。',
        initialForm: {
          paramsText: '{}',
        },
        fields: [
          { key: 'paramsText', label: '查询参数 JSON', type: 'textarea', rows: 4, placeholder: '{}' },
        ],
        execute: (form) => adminApi.analyzeAdminDashboard(undefined, parseJsonText(form.paramsText, '管理员 AI 查询参数')),
      }),
      createOperation({
        key: 'admin-person-list',
        title: '员工列表',
        description: '获取员工列表，可写分页或筛选参数。',
        initialForm: {
          paramsText: '{\n  "page": 1,\n  "pageSize": 10\n}',
        },
        fields: [
          { key: 'paramsText', label: '查询参数 JSON', type: 'textarea', rows: 5, placeholder: '{}' },
        ],
        execute: (form) => adminApi.getPersonList(undefined, parseJsonText(form.paramsText, '员工列表查询参数')),
      }),
      createOperation({
        key: 'admin-person-create',
        title: '创建员工',
        description: '提交员工基础资料。',
        initialForm: {
          dataText: '{\n  "name": "测试员工",\n  "emp_id": "E10001",\n  "dpt_id": 1,\n  "job": "前端工程师"\n}',
        },
        fields: [
          { key: 'dataText', label: '请求体 JSON', type: 'textarea', rows: 7, placeholder: '{}' },
        ],
        execute: (form) => adminApi.createPerson(undefined, parseJsonText(form.dataText, '创建员工请求体')),
      }),
      createOperation({
        key: 'admin-person-detail',
        title: '员工详情',
        description: '按数据库主键查询单个员工。',
        initialForm: {
          id: '1',
        },
        fields: [{ key: 'id', label: '员工 ID', type: 'text', placeholder: '请输入员工 ID' }],
        execute: (form) => adminApi.getPersonById(undefined, form.id),
      }),
      createOperation({
        key: 'admin-person-update',
        title: '更新员工',
        description: '按数据库主键更新员工信息。',
        initialForm: {
          id: '1',
          dataText: '{\n  "name": "测试员工-更新",\n  "job": "测试岗位"\n}',
        },
        fields: [
          { key: 'id', label: '员工 ID', type: 'text', placeholder: '请输入员工 ID' },
          { key: 'dataText', label: '请求体 JSON', type: 'textarea', rows: 6, placeholder: '{}' },
        ],
        execute: (form) => adminApi.updatePerson(undefined, form.id, parseJsonText(form.dataText, '更新员工请求体')),
      }),
      createOperation({
        key: 'admin-person-delete-id',
        title: '按 ID 删除员工',
        description: '通过数据库 ID 删除员工。',
        initialForm: {
          id: '1',
        },
        fields: [{ key: 'id', label: '员工 ID', type: 'text', placeholder: '请输入员工 ID' }],
        execute: (form) => adminApi.deletePersonById(undefined, form.id),
      }),
      createOperation({
        key: 'admin-person-delete-emp',
        title: '按工号删除员工',
        description: '通过 emp_id 删除员工。',
        initialForm: {
          empId: 'E10001',
        },
        fields: [{ key: 'empId', label: '员工工号', type: 'text', placeholder: '请输入员工工号' }],
        execute: (form) => adminApi.deletePersonByEmpId(undefined, form.empId),
      }),
      createOperation({
        key: 'admin-person-job',
        title: '调整岗位',
        description: '调用 /person/job。',
        initialForm: {
          dataText: '{\n  "emp_id": "E10001",\n  "job": "技术主管"\n}',
        },
        fields: [{ key: 'dataText', label: '请求体 JSON', type: 'textarea', rows: 5, placeholder: '{}' }],
        execute: (form) => adminApi.changePersonJob(undefined, parseJsonText(form.dataText, '调整岗位请求体')),
      }),
      createOperation({
        key: 'admin-person-state',
        title: '调整在职状态',
        description: '调用 /person/state。',
        initialForm: {
          dataText: '{\n  "emp_id": "E10001",\n  "state": 1\n}',
        },
        fields: [{ key: 'dataText', label: '请求体 JSON', type: 'textarea', rows: 5, placeholder: '{}' }],
        execute: (form) => adminApi.changePersonState(undefined, parseJsonText(form.dataText, '调整状态请求体')),
      }),
      createOperation({
        key: 'admin-person-department',
        title: '调整所属部门',
        description: '调用 /person/change-dept。',
        initialForm: {
          dataText: '{\n  "emp_id": "E10001",\n  "dept": "研发部"\n}',
        },
        fields: [{ key: 'dataText', label: '请求体 JSON', type: 'textarea', rows: 5, placeholder: '{}' }],
        execute: (form) => adminApi.changePersonDepartment(undefined, parseJsonText(form.dataText, '调整部门请求体')),
      }),
      createOperation({
        key: 'admin-department-list',
        title: '部门列表',
        description: '获取部门列表，支持分页和 keyword 搜索。',
        initialForm: {
          paramsText: '{\n  "page": 1,\n  "pageSize": 10,\n  "keyword": ""\n}',
        },
        fields: [{ key: 'paramsText', label: '查询参数 JSON', type: 'textarea', rows: 6, placeholder: '{}' }],
        execute: (form) => adminApi.getDepartmentList(undefined, parseJsonText(form.paramsText, '部门列表查询参数')),
      }),
      createOperation({
        key: 'admin-department-detail',
        title: '部门详情',
        description: '按部门 ID 查询详情。',
        initialForm: {
          id: '1',
        },
        fields: [{ key: 'id', label: '部门 ID', type: 'text', placeholder: '请输入部门 ID' }],
        execute: (form) => adminApi.getDepartmentById(undefined, form.id),
      }),
      createOperation({
        key: 'admin-department-create',
        title: '创建部门',
        description: '调用 /department 创建新部门。',
        initialForm: {
          dataText: '{\n  "name": "测试部门",\n  "full_num": 20\n}',
        },
        fields: [{ key: 'dataText', label: '请求体 JSON', type: 'textarea', rows: 5, placeholder: '{}' }],
        execute: (form) => adminApi.createDepartment(undefined, parseJsonText(form.dataText, '创建部门请求体')),
      }),
      createOperation({
        key: 'admin-department-update',
        title: '更新部门',
        description: '按部门 ID 更新信息。',
        initialForm: {
          id: '1',
          dataText: '{\n  "name": "测试部门-更新",\n  "full_num": 25\n}',
        },
        fields: [
          { key: 'id', label: '部门 ID', type: 'text', placeholder: '请输入部门 ID' },
          { key: 'dataText', label: '请求体 JSON', type: 'textarea', rows: 5, placeholder: '{}' },
        ],
        execute: (form) => adminApi.updateDepartment(undefined, form.id, parseJsonText(form.dataText, '更新部门请求体')),
      }),
      createOperation({
        key: 'admin-department-delete',
        title: '删除部门',
        description: '按部门 ID 删除。',
        initialForm: {
          id: '1',
        },
        fields: [{ key: 'id', label: '部门 ID', type: 'text', placeholder: '请输入部门 ID' }],
        execute: (form) => adminApi.deleteDepartment(undefined, form.id),
      }),
      createOperation({
        key: 'admin-personnel-list',
        title: '人事变更列表',
        description: '获取所有变更记录。',
        initialForm: {
          paramsText: '{\n  "page": 1,\n  "pageSize": 10\n}',
        },
        fields: [{ key: 'paramsText', label: '查询参数 JSON', type: 'textarea', rows: 5, placeholder: '{}' }],
        execute: (form) => adminApi.getPersonnelList(undefined, parseJsonText(form.paramsText, '变更列表查询参数')),
      }),
      createOperation({
        key: 'admin-personnel-detail',
        title: '人事变更详情',
        description: '按变更 ID 查询详情。',
        initialForm: {
          id: '1',
        },
        fields: [{ key: 'id', label: '变更 ID', type: 'text', placeholder: '请输入变更 ID' }],
        execute: (form) => adminApi.getPersonnelById(undefined, form.id),
      }),
      createOperation({
        key: 'admin-personnel-create',
        title: '管理员发起变更',
        description: '直接创建人事变更记录。',
        initialForm: {
          dataText: '{\n  "emp_id": "E10001",\n  "change_type": 1,\n  "target_dpt": 2,\n  "description": "测试调部门"\n}',
        },
        fields: [{ key: 'dataText', label: '请求体 JSON', type: 'textarea', rows: 7, placeholder: '{}' }],
        execute: (form) => adminApi.createPersonnel(undefined, parseJsonText(form.dataText, '创建变更请求体')),
      }),
      createOperation({
        key: 'admin-personnel-approve',
        title: '审批人事变更',
        description: '审批通过或驳回申请。',
        initialForm: {
          dataText: '{\n  "id": 1,\n  "approver": "admin",\n  "approve": true\n}',
        },
        fields: [{ key: 'dataText', label: '请求体 JSON', type: 'textarea', rows: 6, placeholder: '{}' }],
        execute: (form) => adminApi.approvePersonnel(undefined, parseJsonText(form.dataText, '审批变更请求体')),
      }),
      createOperation({
        key: 'admin-account-list',
        title: '账号列表',
        description: '获取系统账号列表。',
        initialForm: {
          paramsText: '{\n  "page": 1,\n  "pageSize": 10\n}',
        },
        fields: [{ key: 'paramsText', label: '查询参数 JSON', type: 'textarea', rows: 5, placeholder: '{}' }],
        execute: (form) => adminApi.getAccountList(undefined, parseJsonText(form.paramsText, '账号列表查询参数')),
      }),
      createOperation({
        key: 'admin-account-create',
        title: '创建账号',
        description: '创建新的 staff 或 admin 账号。',
        initialForm: {
          dataText: '{\n  "username": "new_user",\n  "password": "123456",\n  "role": "staff"\n}',
        },
        fields: [{ key: 'dataText', label: '请求体 JSON', type: 'textarea', rows: 6, placeholder: '{}' }],
        execute: (form) => adminApi.createAccount(undefined, parseJsonText(form.dataText, '创建账号请求体')),
      }),
      createOperation({
        key: 'admin-account-update',
        title: '更新账号',
        description: '更新账号角色或状态。',
        initialForm: {
          id: '1',
          dataText: '{\n  "role": "staff",\n  "status": 1\n}',
        },
        fields: [
          { key: 'id', label: '账号 ID', type: 'text', placeholder: '请输入账号 ID' },
          { key: 'dataText', label: '请求体 JSON', type: 'textarea', rows: 5, placeholder: '{}' },
        ],
        execute: (form) => adminApi.updateAccount(undefined, form.id, parseJsonText(form.dataText, '更新账号请求体')),
      }),
      createOperation({
        key: 'admin-account-delete',
        title: '删除账号',
        description: '按账号 ID 删除。',
        initialForm: {
          id: '1',
        },
        fields: [{ key: 'id', label: '账号 ID', type: 'text', placeholder: '请输入账号 ID' }],
        execute: (form) => adminApi.deleteAccount(undefined, form.id),
      }),
      createOperation({
        key: 'admin-notice-create',
        title: '创建公告',
        description: '发布新公告。',
        initialForm: {
          dataText: '{\n  "title": "测试公告",\n  "content": "这是一条用于接口联调的测试公告",\n  "publisher": "admin"\n}',
        },
        fields: [{ key: 'dataText', label: '请求体 JSON', type: 'textarea', rows: 7, placeholder: '{}' }],
        execute: (form) => adminApi.createNotice(undefined, parseJsonText(form.dataText, '创建公告请求体')),
      }),
      createOperation({
        key: 'admin-notice-detail',
        title: '公告详情',
        description: '按公告 ID 查询详情。',
        initialForm: {
          id: '1',
        },
        fields: [{ key: 'id', label: '公告 ID', type: 'text', placeholder: '请输入公告 ID' }],
        execute: (form) => adminApi.getNoticeById(undefined, form.id),
      }),
      createOperation({
        key: 'admin-notice-update',
        title: '更新公告',
        description: '按公告 ID 更新内容。',
        initialForm: {
          id: '1',
          dataText: '{\n  "title": "测试公告-更新",\n  "content": "这是一条更新后的公告",\n  "publisher": "admin"\n}',
        },
        fields: [
          { key: 'id', label: '公告 ID', type: 'text', placeholder: '请输入公告 ID' },
          { key: 'dataText', label: '请求体 JSON', type: 'textarea', rows: 7, placeholder: '{}' },
        ],
        execute: (form) => adminApi.updateNotice(undefined, form.id, parseJsonText(form.dataText, '更新公告请求体')),
      }),
      createOperation({
        key: 'admin-notice-delete',
        title: '删除公告',
        description: '按公告 ID 删除。',
        initialForm: {
          id: '1',
        },
        fields: [{ key: 'id', label: '公告 ID', type: 'text', placeholder: '请输入公告 ID' }],
        execute: (form) => adminApi.deleteNotice(undefined, form.id),
      }),
      createOperation({
        key: 'admin-profile',
        title: '员工完整档案',
        description: '按工号查询完整个人档案。',
        initialForm: {
          empId: 'E10001',
        },
        fields: [{ key: 'empId', label: '员工工号', type: 'text', placeholder: '请输入员工工号' }],
        execute: (form) => adminApi.getPersonProfile(undefined, form.empId),
      }),
      createOperation({
        key: 'admin-attendance-list',
        title: '考勤列表',
        description: '管理员按条件查询考勤。',
        initialForm: {
          paramsText: '{\n  "emp_id": "E10001",\n  "start": "2026-03-01",\n  "end": "2026-03-31"\n}',
        },
        fields: [{ key: 'paramsText', label: '查询参数 JSON', type: 'textarea', rows: 6, placeholder: '{}' }],
        execute: (form) => adminApi.searchAttendance(undefined, parseJsonText(form.paramsText, '考勤查询参数')),
      }),
      createOperation({
        key: 'admin-attendance-update',
        title: '更新考勤',
        description: '按考勤 ID 修改状态、备注或打卡时间。',
        initialForm: {
          id: '1',
          dataText: '{\n  "status": 1,\n  "remark": "手动修正",\n  "check_in": "2026-03-16T09:00:00Z",\n  "check_out": "2026-03-16T18:00:00Z"\n}',
        },
        fields: [
          { key: 'id', label: '考勤 ID', type: 'text', placeholder: '请输入考勤 ID' },
          { key: 'dataText', label: '请求体 JSON', type: 'textarea', rows: 8, placeholder: '{}' },
        ],
        execute: (form) => adminApi.updateAttendance(undefined, form.id, parseJsonText(form.dataText, '更新考勤请求体')),
      }),
      createOperation({
        key: 'admin-attendance-delete',
        title: '删除考勤',
        description: '按考勤 ID 删除记录。',
        initialForm: {
          id: '1',
        },
        fields: [{ key: 'id', label: '考勤 ID', type: 'text', placeholder: '请输入考勤 ID' }],
        execute: (form) => adminApi.deleteAttendance(undefined, form.id),
      }),
    ],
  },
  {
    key: 'user',
    title: '普通用户接口',
    description: '这里覆盖用户仪表盘、档案、部门、变更申请、考勤与权限矩阵。',
    operations: [
      createOperation({
        key: 'user-dashboard',
        title: '用户仪表盘',
        description: '获取普通用户首页数据。',
        initialForm: {},
        fields: [],
        execute: () => userApi.getUserDashboard(),
      }),
      createOperation({
        key: 'user-ai-dashboard',
        title: '用户 AI 分析',
        description: '获取普通用户首页的 AI 分析结果。',
        initialForm: {
          paramsText: '{}',
        },
        fields: [{ key: 'paramsText', label: '查询参数 JSON', type: 'textarea', rows: 4, placeholder: '{}' }],
        execute: (form) => userApi.analyzeUserDashboard(undefined, parseJsonText(form.paramsText, '用户 AI 查询参数')),
      }),
      createOperation({
        key: 'user-profile-detail',
        title: '指定档案详情',
        description: '按 Person ID 查询档案。',
        initialForm: {
          id: '1',
        },
        fields: [{ key: 'id', label: 'Person ID', type: 'text', placeholder: '请输入 Person ID' }],
        execute: (form) => userApi.getUserProfileById(undefined, form.id),
      }),
      createOperation({
        key: 'user-profile-update',
        title: '更新我的档案',
        description: '按 Person ID 更新可编辑字段。',
        initialForm: {
          id: '1',
          dataText: '{\n  "name": "员工-更新",\n  "job": "前端开发"\n}',
        },
        fields: [
          { key: 'id', label: 'Person ID', type: 'text', placeholder: '请输入 Person ID' },
          { key: 'dataText', label: '请求体 JSON', type: 'textarea', rows: 6, placeholder: '{}' },
        ],
        execute: (form) => userApi.updateUserProfileById(undefined, form.id, parseJsonText(form.dataText, '更新档案请求体')),
      }),
      createOperation({
        key: 'user-profile-self',
        title: '我的完整档案',
        description: '读取当前登录用户自己的档案。',
        initialForm: {},
        fields: [],
        execute: () => userApi.getMyProfile(),
      }),
      createOperation({
        key: 'user-department-detail',
        title: '部门详情',
        description: '普通用户按部门 ID 查询详情。',
        initialForm: {
          id: '1',
        },
        fields: [{ key: 'id', label: '部门 ID', type: 'text', placeholder: '请输入部门 ID' }],
        execute: (form) => userApi.getDepartmentById(undefined, form.id),
      }),
      createOperation({
        key: 'user-change-request',
        title: '提交变更申请',
        description: '普通用户发起调岗、调部门或离职申请。',
        initialForm: {
          dataText: '{\n  "emp_id": "E10001",\n  "change_type": 1,\n  "target_dpt": 2,\n  "description": "申请调往测试部门"\n}',
        },
        fields: [{ key: 'dataText', label: '请求体 JSON', type: 'textarea', rows: 7, placeholder: '{}' }],
        execute: (form) => userApi.createChangeRequest(undefined, parseJsonText(form.dataText, '变更申请请求体')),
      }),
      createOperation({
        key: 'user-attendance-checkin',
        title: '上班签到',
        description: '调用 /attendance/checkin。默认发送空体。',
        initialForm: {
          dataText: '',
        },
        fields: [
          {
            key: 'dataText',
            label: '可选请求体 JSON',
            type: 'textarea',
            rows: 4,
            placeholder: '留空则发送空请求体',
          },
        ],
        execute: (form) => userApi.checkIn(undefined, parseJsonText(form.dataText, '签到请求体')),
      }),
      createOperation({
        key: 'user-attendance-checkout',
        title: '下班签退',
        description: '调用 /attendance/checkout。默认发送空体。',
        initialForm: {
          dataText: '',
        },
        fields: [
          {
            key: 'dataText',
            label: '可选请求体 JSON',
            type: 'textarea',
            rows: 4,
            placeholder: '留空则发送空请求体',
          },
        ],
        execute: (form) => userApi.checkOut(undefined, parseJsonText(form.dataText, '签退请求体')),
      }),
      createOperation({
        key: 'user-attendance-my',
        title: '我的考勤记录',
        description: '查询当前用户自己的考勤。',
        initialForm: {
          paramsText: '{\n  "start": "2026-03-01",\n  "end": "2026-03-31",\n  "page": 1,\n  "pageSize": 10\n}',
        },
        fields: [{ key: 'paramsText', label: '查询参数 JSON', type: 'textarea', rows: 7, placeholder: '{}' }],
        execute: (form) => userApi.getMyAttendance(undefined, parseJsonText(form.paramsText, '我的考勤查询参数')),
      }),
      createOperation({
        key: 'user-permissions',
        title: '权限矩阵',
        description: '获取当前用户的接口权限状态。',
        initialForm: {},
        fields: [],
        execute: () => userApi.getPermissions(),
      }),
    ],
  },
]

const visibleGroups = computed(() => operationGroups.filter((group) => group.key === activeGroup.value))
const tokenSummary = computed(() => {
  if (!authStore.token) {
    return '当前未登录'
  }

  const preview = authStore.token.length > 24 ? `${authStore.token.slice(0, 24)}...` : authStore.token
  return `已登录，Token 预览：${preview}`
})
</script>

<template>
  <div class="api-lab">
    <header class="hero">
      <div class="hero__copy">
        <p class="eyebrow">Vue 3 API Lab</p>
        <h1>接口全功能测试台</h1>
        <p class="hero__text">
          这个页面直接基于当前 apis 层工作，用来验证登录态、公共接口、管理员接口和普通用户接口是否能正常联调。
        </p>
      </div>

      <div class="hero__status">
        <div class="status-card">
          <span class="status-card__label">认证状态</span>
          <strong>{{ authStore.isAuthenticated ? '已注入 Token' : '未注入 Token' }}</strong>
          <p>{{ tokenSummary }}</p>
        </div>

        <div class="status-card">
          <span class="status-card__label">最近请求</span>
          <strong>{{ lastActionTitle }}</strong>
          <p :class="['status-chip', `status-chip--${lastStatus}`]">
            {{ lastStatus === 'success' ? '成功' : lastStatus === 'error' ? '失败' : '待执行' }}
          </p>
        </div>
      </div>
    </header>

    <main class="workspace">
      <section class="workspace__left">
        <article class="token-panel">
          <div class="section-heading">
            <h2>Token 控制台</h2>
            <p>这里可以手动写入、恢复或清空 token，便于切换管理员和普通用户身份测试。</p>
          </div>

          <label class="field">
            <span class="field__label">手动维护 Token</span>
            <textarea
              v-model="manualToken"
              class="field__control field__control--textarea"
              rows="4"
              placeholder="可粘贴登录后返回的 token"
            />
          </label>

          <div class="token-panel__actions">
            <button class="action-button action-button--primary" type="button" @click="syncManualToken">
              写入 Token
            </button>
            <button class="action-button" type="button" @click="hydrateToken">从缓存恢复</button>
            <button class="action-button action-button--danger" type="button" @click="clearToken">
              清空 Token
            </button>
          </div>
        </article>

        <nav class="group-tabs" aria-label="API 分类导航">
          <button
            v-for="tab in groupTabs"
            :key="tab.key"
            :class="['group-tabs__button', { 'group-tabs__button--active': activeGroup === tab.key }]"
            type="button"
            @click="activeGroup = tab.key"
          >
            {{ tab.label }}
          </button>
        </nav>

        <section v-for="group in visibleGroups" :key="group.key" class="group-panel">
          <div class="section-heading">
            <h2>{{ group.title }}</h2>
            <p>{{ group.description }}</p>
          </div>

          <div class="operation-grid">
            <article v-for="operation in group.operations" :key="operation.key" class="operation-card">
              <div class="operation-card__header">
                <h3>{{ operation.title }}</h3>
                <p>{{ operation.description }}</p>
              </div>

              <div v-if="operation.fields.length" class="operation-card__fields">
                <label v-for="field in operation.fields" :key="field.key" class="field">
                  <span class="field__label">{{ field.label }}</span>

                  <textarea
                    v-if="field.type === 'textarea'"
                    v-model="operation.form[field.key]"
                    class="field__control field__control--textarea"
                    :rows="field.rows || 5"
                    :placeholder="field.placeholder || ''"
                  />

                  <input
                    v-else
                    v-model="operation.form[field.key]"
                    class="field__control"
                    :type="field.type || 'text'"
                    :placeholder="field.placeholder || ''"
                  />
                </label>
              </div>

              <button
                class="action-button action-button--primary"
                type="button"
                :disabled="loadingKey === operation.key"
                @click="executeOperation(operation)"
              >
                {{ loadingKey === operation.key ? '请求中...' : '执行请求' }}
              </button>
            </article>
          </div>
        </section>
      </section>

      <aside class="workspace__right">
        <article class="console-panel">
          <div class="section-heading">
            <h2>响应控制台</h2>
            <p>这里显示最近一次接口调用结果，成功和失败都会保留结构化输出。</p>
          </div>

          <div class="console-meta">
            <span>最近操作：{{ lastActionTitle }}</span>
            <span :class="['status-chip', `status-chip--${lastStatus}`]">
              {{ lastStatus === 'success' ? '成功' : lastStatus === 'error' ? '失败' : '待执行' }}
            </span>
          </div>

          <p v-if="errorMessage" class="console-error">{{ errorMessage }}</p>
          <pre class="console-output">{{ responseText }}</pre>
        </article>
      </aside>
    </main>
  </div>
</template>

<style scoped>
:global(body) {
  margin: 0;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background:
    radial-gradient(circle at top left, rgba(242, 196, 108, 0.22), transparent 28%),
    radial-gradient(circle at top right, rgba(28, 78, 61, 0.2), transparent 30%),
    linear-gradient(180deg, #f8f1de 0%, #efe4c9 100%);
  color: #1f2a24;
}

:global(*) {
  box-sizing: border-box;
}

.api-lab {
  min-height: 100vh;
  padding: 32px;
}

.hero {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 24px;
  margin-bottom: 28px;
  align-items: stretch;
}

.hero__copy,
.hero__status,
.token-panel,
.group-panel,
.console-panel {
  border: 1px solid rgba(31, 42, 36, 0.08);
  border-radius: 24px;
  background: rgba(255, 252, 245, 0.82);
  box-shadow: 0 16px 40px rgba(79, 58, 24, 0.08);
  backdrop-filter: blur(16px);
}

.hero__copy {
  padding: 28px;
}

.hero__copy h1 {
  margin: 12px 0;
  font-size: clamp(2.2rem, 4vw, 3.8rem);
  line-height: 1.05;
}

.hero__text {
  max-width: 58ch;
  margin: 0;
  line-height: 1.7;
  color: #4e574f;
}

.eyebrow {
  margin: 0;
  color: #996d21;
  letter-spacing: 0.18em;
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
}

.hero__status {
  display: grid;
  gap: 16px;
  padding: 20px;
}

.status-card {
  padding: 18px 20px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(255, 247, 228, 0.95), rgba(242, 231, 204, 0.85));
}

.status-card strong {
  display: block;
  margin-top: 6px;
  font-size: 1.05rem;
}

.status-card p {
  margin: 8px 0 0;
  color: #556159;
  line-height: 1.6;
}

.status-card__label {
  color: #7e6430;
  font-size: 0.82rem;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(320px, 0.95fr);
  gap: 24px;
}

.workspace__left {
  display: grid;
  gap: 20px;
}

.workspace__right {
  position: relative;
}

.token-panel,
.group-panel,
.console-panel {
  padding: 22px;
}

.token-panel__actions,
.group-tabs {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.group-tabs__button,
.action-button {
  appearance: none;
  border: 1px solid rgba(31, 42, 36, 0.14);
  border-radius: 999px;
  padding: 11px 16px;
  background: rgba(255, 255, 255, 0.84);
  color: #1f2a24;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.group-tabs__button:hover,
.action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(31, 42, 36, 0.08);
}

.group-tabs__button--active,
.action-button--primary {
  background: linear-gradient(135deg, #1f5c49, #2d7c64);
  color: #f6f2e7;
  border-color: transparent;
}

.action-button--danger {
  background: linear-gradient(135deg, #8f3d26, #bc5633);
  color: #fff5ed;
  border-color: transparent;
}

.action-button:disabled {
  opacity: 0.65;
  cursor: wait;
  transform: none;
}

.section-heading h2,
.operation-card__header h3 {
  margin: 0;
}

.section-heading p,
.operation-card__header p {
  margin: 6px 0 0;
  color: #58645c;
  line-height: 1.65;
}

.operation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.operation-card {
  display: grid;
  gap: 16px;
  padding: 18px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 249, 236, 0.96), rgba(249, 241, 223, 0.88));
  border: 1px solid rgba(31, 42, 36, 0.08);
}

.operation-card__fields {
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 8px;
}

.field__label {
  font-size: 0.92rem;
  font-weight: 600;
  color: #2f3b34;
}

.field__control {
  width: 100%;
  border: 1px solid rgba(31, 42, 36, 0.15);
  border-radius: 14px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.9);
  color: #223029;
  font: inherit;
}

.field__control:focus {
  outline: 2px solid rgba(45, 124, 100, 0.18);
  border-color: #2d7c64;
}

.field__control--textarea {
  resize: vertical;
  min-height: 92px;
  font-family: 'Consolas', 'Courier New', monospace;
  line-height: 1.55;
}

.console-panel {
  position: sticky;
  top: 24px;
}

.console-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 18px 0 14px;
  color: #58645c;
  flex-wrap: wrap;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.84rem;
  font-weight: 700;
}

.status-chip--idle {
  background: rgba(114, 126, 120, 0.12);
  color: #526057;
}

.status-chip--success {
  background: rgba(45, 124, 100, 0.14);
  color: #1e684f;
}

.status-chip--error {
  background: rgba(188, 86, 51, 0.14);
  color: #9e3d20;
}

.console-error {
  margin: 0 0 14px;
  color: #9e3d20;
  font-weight: 600;
}

.console-output {
  margin: 0;
  max-height: calc(100vh - 260px);
  overflow: auto;
  padding: 18px;
  border-radius: 18px;
  background: #1a231f;
  color: #e9f5ee;
  line-height: 1.6;
  font-size: 0.92rem;
  font-family: 'Consolas', 'Courier New', monospace;
}

@media (max-width: 1100px) {
  .hero,
  .workspace {
    grid-template-columns: 1fr;
  }

  .console-panel {
    position: static;
  }

  .console-output {
    max-height: 420px;
  }
}

@media (max-width: 720px) {
  .api-lab {
    padding: 18px;
  }

  .hero__copy,
  .hero__status,
  .token-panel,
  .group-panel,
  .console-panel {
    padding: 18px;
    border-radius: 18px;
  }

  .operation-grid {
    grid-template-columns: 1fr;
  }

  .group-tabs__button,
  .action-button {
    width: 100%;
    justify-content: center;
  }
}
</style>