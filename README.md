# Vue3 Frontend / 人事管理前端

A Vue 3 frontend project for HR management, including login/register pages and API testing tools.

这是一个基于 Vue 3 的人事管理前端项目，包含登录/注册页面与接口测试功能。

## Tech Stack / 技术栈

- Vue 3
- Vue Router
- Pinia
- Element Plus
- Vite
- JavaScript (ES Modules)

## Backend Integration / 后端联动

This frontend is designed to work with the following backend project:

该前端建议配合以下后端项目使用：

- https://github.com/Julian-Meng/Gin-Backend

## Quick Start / 快速开始

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

- Default route points to the login page.
- Register page is available and defaults new users to `staff` role.
- API test page is available at `/api-test` for integration debugging.
- Token auth is automatically handled by the request layer (Pinia + localStorage fallback).

- 默认路由为登录页。
- 已提供注册页，新建账号默认使用 `staff` 权限。
- 提供 `/api-test` 接口测试页，便于联调。
- 请求层自动注入 Token（优先 Pinia，回退 localStorage）。

## License / 许可证

For study and internal use.

用于学习与内部使用。
