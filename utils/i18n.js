import { createI18n } from 'vue-i18n'

const LOCALE_STORAGE_KEY = 'app_locale'
const SUPPORTED_LOCALES = ['zh-CN', 'en-US']

function resolveLocale() {
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY)
  if (saved && SUPPORTED_LOCALES.includes(saved)) {
    return saved
  }

  const browserLocale = navigator.language
  if (SUPPORTED_LOCALES.includes(browserLocale)) {
    return browserLocale
  }

  return 'zh-CN'
}

const messages = {
  'zh-CN': {
    common: {
      localeLabel: '中文',
      switchTo: 'EN',
    },
    auth: {
      logoSub: 'Natural Experience',
      loadingQuote: '正在加载一言...',
      fallbackQuote: '风起于青萍之末，浪成于微澜之间。',
      fallbackFrom: '一言',
      username: '用户名',
      password: '密码',
      loginTitle: '欢迎回来',
      loginSubtitle: '请输入账号与密码继续',
      loginButton: '登录',
      rememberPassword: '记住密码',
      createAccount: '创建新账号',
      loginMissingFields: '请输入用户名和密码',
      loginTokenMissing: '登录成功但未返回 token',
      loginPersistInfo: '本项目当前默认持久化 token，可后续扩展为会话态',
      loginSuccess: '登录成功，正在进入测试页面',
      loginFailed: '登录失败，请检查账号和密码',
      registerTitle: '创建账号',
      registerSubtitle: '创建账号后即可进入系统',
      confirmPassword: '确认密码',
      registerButton: '创建账号',
      registerBackToLogin: '已有账号？返回登录',
      registerPasswordMismatch: '两次输入的密码不一致',
      registerSuccess: '创建账号成功，请返回登录',
      registerFailed: '创建账号失败，请稍后重试',
    },
    dashboard: {
      appTitle: 'HR 管理系统',
      loading: '加载中...',
      toggleSidebar: '切换侧栏',
      expandSidebar: '展开侧栏',
      collapseSidebar: '收起侧栏',
      roleAdmin: '管理员',
      roleUser: '普通用户',
      logout: '退出登录',
      nav: {
        overview: '概览',
        attendance: '考勤管理',
        notice: '公告',
        department: '部门管理',
        personnel: '人事变更',
        account: '账号管理',
        profile: '个人档案',
      },
      overview: {
        title: '概览',
        adminSub: '管理员汇总数据',
        userSub: '个人数据摘要',
        noData: '暂无数据，请确认已登录并后端服务可用。',
        emptyData: '数据为空。',
        labels: {
          total_employees: '在职员工',
          total_staff: '员工总数',
          employee_count: '员工总数',
          department_count: '部门数量',
          departments: '部门数量',
          pending_changes: '待审批变更',
          pending: '待审批',
          today_checkin: '今日打卡',
          today_attendance: '今日出勤',
          unread_notices: '未读公告',
          notice_count: '公告数量',
          attendance_rate: '出勤率',
          checkin_status: '打卡状态',
          checkin_time: '上班打卡',
          checkout_time: '下班打卡',
        },
      },
      common: {
        query: '查询',
        reset: '重置',
        save: '保存',
        cancel: '取消',
        nextPage: '下一页',
        prevPage: '上一页',
        pageN: '第 {page} 页',
        noData: '暂无数据',
      },
      attendance: {
        loadFailed: '加载失败',
        adminSub: '查看与管理所有员工考勤',
        userSub: '我的考勤记录与打卡',
        checking: '打卡中...',
        checkIn: '上班打卡',
        checkOut: '下班打卡',
      },
      notice: {
        loadFailed: '加载失败',
        sub: '系统公告列表',
        create: '新建公告',
        edit: '编辑公告',
        saving: '保存中...',
      },
      department: {
        loadFailed: '加载失败',
        sub: '管理公司部门',
        create: '新建部门',
        edit: '编辑部门',
        saving: '保存中...',
      },
      personnel: {
        loadFailed: '加载失败',
        adminSub: '审批人事变更申请',
        userSub: '提交人事变更申请',
        submit: '提交申请',
      },
      account: {
        loadFailed: '加载失败',
        sub: '管理系统登录账号',
        create: '新建账号',
        edit: '编辑账号',
        saving: '保存中...',
      },
      profile: {
        loadFailed: '加载失败',
        searching: '查询中...',
        searchHint: '输入工号后点击查询',
        saving: '保存中...',
      },
    },
  },
  'en-US': {
    common: {
      localeLabel: 'EN',
      switchTo: '中文',
    },
    auth: {
      logoSub: 'Natural Experience',
      loadingQuote: 'Loading quote...',
      fallbackQuote: 'Great winds rise from tiny ripples.',
      fallbackFrom: 'Hitokoto',
      username: 'Username',
      password: 'Password',
      loginTitle: 'Welcome Back',
      loginSubtitle: 'Please enter your username and password to continue',
      loginButton: 'LOGIN',
      rememberPassword: 'Remember me',
      createAccount: 'Create account',
      loginMissingFields: 'Please enter username and password',
      loginTokenMissing: 'Login succeeded but token is missing',
      loginPersistInfo: 'Token is persisted by default in this project',
      loginSuccess: 'Login successful, redirecting to API test page',
      loginFailed: 'Login failed, please check username and password',
      registerTitle: 'Create Account',
      registerSubtitle: 'Create an account to access the system',
      confirmPassword: 'Confirm Password',
      registerButton: 'SIGN UP',
      registerBackToLogin: 'Already have an account? Back to login',
      registerPasswordMismatch: 'The passwords do not match',
      registerSuccess: 'Account created successfully, please login',
      registerFailed: 'Failed to create account, please try again later',
    },
    dashboard: {
      appTitle: 'HR Management',
      loading: 'Loading...',
      toggleSidebar: 'Toggle sidebar',
      expandSidebar: 'Expand sidebar',
      collapseSidebar: 'Collapse sidebar',
      roleAdmin: 'Admin',
      roleUser: 'User',
      logout: 'Log out',
      nav: {
        overview: 'Overview',
        attendance: 'Attendance',
        notice: 'Notices',
        department: 'Departments',
        personnel: 'Personnel Changes',
        account: 'Accounts',
        profile: 'Profile',
      },
      overview: {
        title: 'Overview',
        adminSub: 'Admin summary',
        userSub: 'Personal summary',
        noData: 'No data. Please verify login and backend service.',
        emptyData: 'Data is empty.',
        labels: {
          total_employees: 'Active Employees',
          total_staff: 'Total Staff',
          employee_count: 'Employee Count',
          department_count: 'Department Count',
          departments: 'Department Count',
          pending_changes: 'Pending Changes',
          pending: 'Pending',
          today_checkin: 'Today Check-ins',
          today_attendance: 'Today Attendance',
          unread_notices: 'Unread Notices',
          notice_count: 'Notice Count',
          attendance_rate: 'Attendance Rate',
          checkin_status: 'Check-in Status',
          checkin_time: 'Check-in Time',
          checkout_time: 'Check-out Time',
        },
      },
      common: {
        query: 'Search',
        reset: 'Reset',
        save: 'Save',
        cancel: 'Cancel',
        nextPage: 'Next',
        prevPage: 'Prev',
        pageN: 'Page {page}',
        noData: 'No data',
      },
      attendance: {
        loadFailed: 'Load failed',
        adminSub: 'View and manage all attendance records',
        userSub: 'My attendance and check-in actions',
        checking: 'Processing...',
        checkIn: 'Check In',
        checkOut: 'Check Out',
      },
      notice: {
        loadFailed: 'Load failed',
        sub: 'System notices',
        create: 'Create Notice',
        edit: 'Edit Notice',
        saving: 'Saving...',
      },
      department: {
        loadFailed: 'Load failed',
        sub: 'Manage company departments',
        create: 'Create Department',
        edit: 'Edit Department',
        saving: 'Saving...',
      },
      personnel: {
        loadFailed: 'Load failed',
        adminSub: 'Review personnel change requests',
        userSub: 'Submit personnel change requests',
        submit: 'Submit Request',
      },
      account: {
        loadFailed: 'Load failed',
        sub: 'Manage login accounts',
        create: 'Create Account',
        edit: 'Edit Account',
        saving: 'Saving...',
      },
      profile: {
        loadFailed: 'Load failed',
        searching: 'Searching...',
        searchHint: 'Enter employee ID and search',
        saving: 'Saving...',
      },
    },
  },
}

export const i18n = createI18n({
  legacy: false,
  locale: resolveLocale(),
  fallbackLocale: 'zh-CN',
  messages,
})

export function toggleLocale() {
  const nextLocale = i18n.global.locale.value === 'zh-CN' ? 'en-US' : 'zh-CN'
  i18n.global.locale.value = nextLocale
  localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale)
}
