import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import {
    clearAuthToken,
    getStoredToken,
    saveAuthToken,
    setTokenPersistence,
    setTokenResolver,
} from '../../apis/request';
import { normalizeRole } from '../../utils/roleUtils';

const ROLE_STORAGE_KEY = 'auth_role';
const TOKEN_STORAGE_KEYS = ['auth_token', 'token', 'access_token'];

function canUseLocalStorage() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function canUseSessionStorage() {
    return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function getStorageByPersistence(persistence) {
    if (persistence === 'session') {
        return canUseSessionStorage() ? window.sessionStorage : null;
    }

    return canUseLocalStorage() ? window.localStorage : null;
}

function getStoredRole() {
    const sessionStorage = getStorageByPersistence('session');
    const localStorage = getStorageByPersistence('local');

    if (sessionStorage) {
        const stored = normalizeRole(sessionStorage.getItem(ROLE_STORAGE_KEY));
        if (stored) {
            return stored;
        }
    }

    if (localStorage) {
        return normalizeRole(localStorage.getItem(ROLE_STORAGE_KEY));
    }

    return '';
}

function detectTokenPersistence() {
    const sessionStorage = getStorageByPersistence('session');
    const localStorage = getStorageByPersistence('local');

    if (sessionStorage) {
        for (const key of TOKEN_STORAGE_KEYS) {
            if (sessionStorage.getItem(key)) {
                return 'session';
            }
        }
    }

    if (localStorage) {
        for (const key of TOKEN_STORAGE_KEYS) {
            if (localStorage.getItem(key)) {
                return 'local';
            }
        }
    }

    return 'local';
}

function persistRole(nextRole, persistence) {
    const normalizedRole = normalizeRole(nextRole);
    const resolvedPersistence = persistence === 'session' ? 'session' : 'local';

    ['local', 'session'].forEach((storageType) => {
        const storage = getStorageByPersistence(storageType);
        if (!storage) {
            return;
        }

        if (!normalizedRole || storageType !== resolvedPersistence) {
            storage.removeItem(ROLE_STORAGE_KEY);
        }
    });

    if (!normalizedRole) {
        return normalizedRole;
    }

    const targetStorage = getStorageByPersistence(resolvedPersistence);
    if (targetStorage) {
        targetStorage.setItem(ROLE_STORAGE_KEY, normalizedRole);
    }

    return normalizedRole;
}

export const useAuthStore = defineStore('auth', () => {
    // token 先从本地缓存恢复，保证页面刷新后请求层仍可继续工作。
    const token = ref(getStoredToken());
    const role = ref(getStoredRole());
    const persistence = ref(detectTokenPersistence());

    const isAuthenticated = computed(() => Boolean(token.value));

    // 从 localStorage 重新同步 token。
    // 适合应用启动时或外部手动改动缓存后调用。
    function hydrateToken() {
        token.value = getStoredToken();
        persistence.value = detectTokenPersistence();
    }

    function hydrateRole() {
        role.value = getStoredRole();
    }

    // 写入新的登录 token，并同步持久化。
    function setToken(nextToken, { remember = true } = {}) {
        const normalizedToken = typeof nextToken === 'string' ? nextToken.trim() : '';

        token.value = normalizedToken;

        if (normalizedToken) {
            const nextPersistence = remember ? 'local' : 'session';
            persistence.value = nextPersistence;
            setTokenPersistence(nextPersistence);
            saveAuthToken(normalizedToken, { persistence: nextPersistence });
            return;
        }

        clearAuthToken();
        persistRole('', persistence.value);
        role.value = '';
    }

    function setRole(nextRole, { remember, persistence: forcedPersistence } = {}) {
        const resolvedPersistence =
            forcedPersistence || (remember !== undefined ? (remember ? 'local' : 'session') : '');
        const targetPersistence = resolvedPersistence || persistence.value || 'local';
        persistence.value = targetPersistence;
        role.value = persistRole(nextRole, targetPersistence);
    }

    // 清空当前登录态。
    function clearToken() {
        token.value = '';
        clearAuthToken();
        persistRole('', persistence.value);
        role.value = '';
    }

    // 将 Pinia 中的 token 暴露给请求层。
    // 请求发起时会优先读这里，读不到时再回退到 localStorage。
    function registerTokenResolver() {
        setTokenResolver(() => token.value || getStoredToken());
    }

    return {
        token,
        role,
        persistence,
        isAuthenticated,
        hydrateToken,
        hydrateRole,
        setToken,
        setRole,
        clearToken,
        registerTokenResolver,
    };
});
