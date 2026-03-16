import { request } from './request'

// 无需登录的公共接口。

// 用户登录。
export function login(data) {
  return request({
    url: '/api/login',
    method: 'POST',
    withAuth: false,
    data,
  })
}

// 用户注册。
export function register(data) {
  return request({
    url: '/api/register',
    method: 'POST',
    withAuth: false,
    data,
  })
}

// 获取公告列表。
export function getNoticeList(params) {
  return request({
    url: '/api/notice',
    method: 'GET',
    withAuth: false,
    params,
  })
}

// 与 AI 助手对话。
export function chatWithAI(data) {
  return request({
    url: '/api/chat',
    method: 'POST',
    withAuth: false,
    data,
  })
}