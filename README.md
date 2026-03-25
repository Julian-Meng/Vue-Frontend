# Vue3 Frontend / 人事管理前端

A Vue 3 HR management frontend with authentication, role-based dashboard modules, bilingual UI, and API debugging tools.

这是一个基于 Vue 3 的人事管理前端项目，已实现认证、按角色展示的仪表盘模块、中英文界面与接口调试工具。

## Tech Stack / 技术栈

- Vue 3
- Vue Router
- Pinia
- Element Plus
- vue-i18n
- Vite
- JavaScript (ES Modules)

## Backend Integration / 后端联动

This frontend is designed to work with the following backend project:

该前端建议配合以下后端项目使用：

- https://github.com/Julian-Meng/Gin-Backend

## Quick Start / 快速开始

Recommended Node.js version: `^20.19.0 || >=22.12.0`.

推荐使用 Node.js 版本：`^20.19.0 || >=22.12.0`。

### 1) Install dependencies / 安装依赖

```bash
npm install
```

### 2) Configure environment / 配置环境变量

Create `.env` from `.env.example` and set API base URL.

基于 `.env.example` 创建 `.env`，并配置后端地址。

```env
VITE_API_BASE_URL=http://localhost:2077
```

### 3) Run development server / 启动开发环境

```bash
npm run dev
```

### 4) Build for production / 生产构建

```bash
npm run build
```

### 5) Preview production build / 预览构建结果

```bash
npm run preview
```

## Project Notes / 项目说明

- Login/register flow is available, and token state is persisted via Pinia + localStorage fallback.
- Router guards are enabled: unauthenticated users are redirected to `/`, authenticated users entering `/` are redirected to `/dashboard`.
- Dashboard is online with overview, attendance, notices, profile, permission matrix, and AI chat panels.
- Admin role has additional management panels (employees, departments, accounts) and can review personnel changes; regular users can submit personnel change requests.
- UI supports `zh-CN` / `en-US` switching and remembers locale in localStorage.
- API test page is available at `/api-test`, with grouped operations for session/public/admin/user APIs and manual token tools.

- 已实现登录/注册流程，Token 状态由 Pinia 管理并回退 localStorage 持久化。
- 已启用路由守卫：未登录访问受保护页面会回到 `/`，已登录访问 `/` 会自动跳转到 `/dashboard`。
- 已上线仪表盘模块：概览、考勤、公告、个人档案、权限矩阵、AI 对话。
- 管理员具备额外管理面板（员工、部门、账号）并可审批人事变更；普通用户可提交人事变更申请。
- 界面支持 `zh-CN` / `en-US` 双语切换，并在 localStorage 记忆语言设置。
- 提供 `/api-test` 接口测试页，按会话/公共/管理员/用户分组，并支持手动 Token 工具。

## License / 许可证

For study and internal use.

用于学习与内部使用。
