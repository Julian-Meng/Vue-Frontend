<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Hide, View } from '@element-plus/icons-vue';

import { getCaptcha } from '../apis/public';
import { request } from '../apis/request';
import { useAuthStore } from '../src/stores/auth';
import { toggleLocale } from '../utils/i18n';
import { normalizeRole } from '../utils/roleUtils';
import AuthAnimatedCharacters from './components/AuthAnimatedCharacters.vue';
import AuthQuoteCard from './components/AuthQuoteCard.vue';
import './styles/auth-pages.css';

const router = useRouter();
const authStore = useAuthStore();
const { t } = useI18n();

const loading = ref(false);
const rememberPassword = ref(true);
const activeField = ref('');
const showPassword = ref(false);
const shakeSignal = ref(0);
const hitokoto = ref(t('auth.loadingQuote'));
const hitokotoFrom = ref('');
const loginNeedCaptcha = ref(false);
const loginCaptchaId = ref('');
const loginCaptchaCode = ref('');
const loginCaptchaImage = ref('');
const loginCaptchaLoading = ref(false);
const loginFailCount = ref(0);

const passwordLength = computed(() => loginForm.password.length);

// 登录表单。
const loginForm = reactive({
    username: '',
    password: '',
});

// 从登录响应中提取 token，兼容多种后端返回结构。
function extractToken(payload) {
    return (
        payload?.data?.token ||
        payload?.token ||
        (typeof payload?.data === 'string' ? payload.data : '') ||
        (typeof payload === 'string' ? payload : '')
    );
}

function extractRole(payload) {
    return payload?.role || payload?.data?.role || '';
}

function resolveAuthErrorMessage(error, fallbackKey) {
    if (!error) {
        return t(fallbackKey);
    }

    const rawMessage = String(error?.message || '').trim();
    const isNetworkError =
        error?.errorType === 'network' ||
        /failed to fetch|networkerror|network request failed/i.test(rawMessage);

    if (isNetworkError) {
        return t('auth.networkError');
    }

    if (/timeout|timed out/i.test(rawMessage)) {
        return t('auth.requestTimeout');
    }

    return rawMessage || t(fallbackKey);
}

function clearLoginCaptchaState() {
    loginNeedCaptcha.value = false;
    loginCaptchaId.value = '';
    loginCaptchaCode.value = '';
    loginCaptchaImage.value = '';
    loginFailCount.value = 0;
}

function isCaptchaErrorMessage(message) {
    return /验证码错误或已过期|captcha/i.test(String(message || '').trim());
}

async function refreshLoginCaptcha({ silent = false } = {}) {
    loginCaptchaLoading.value = true;

    try {
        const payload = await getCaptcha({ scene: 'login' });

        loginCaptchaId.value = payload?.captcha_id || '';
        loginCaptchaImage.value = payload?.image_base64 || '';

        if (!loginCaptchaId.value || !loginCaptchaImage.value) {
            throw new Error(t('auth.captchaLoadFailed'));
        }
    } catch (error) {
        loginCaptchaId.value = '';
        loginCaptchaImage.value = '';

        if (!silent) {
            ElMessage.error(resolveAuthErrorMessage(error, 'auth.captchaLoadFailed'));
        }

        throw error;
    } finally {
        loginCaptchaLoading.value = false;
    }
}

async function handleLogin() {
    if (!loginForm.username.trim() || !loginForm.password.trim()) {
        shakeSignal.value += 1;
        ElMessage.warning(t('auth.loginMissingFields'));
        return;
    }

    if (loginNeedCaptcha.value && !loginCaptchaCode.value.trim()) {
        shakeSignal.value += 1;
        ElMessage.warning(t('auth.captchaMissing'));
        return;
    }

    if (loginNeedCaptcha.value && !loginCaptchaId.value) {
        try {
            await refreshLoginCaptcha();
        } catch {
            return;
        }
    }

    loading.value = true;

    try {
        const requestData = {
            username: loginForm.username.trim(),
            password: loginForm.password,
        };

        if (loginNeedCaptcha.value) {
            requestData.captcha_id = loginCaptchaId.value;
            requestData.captcha_code = loginCaptchaCode.value.trim();
        }

        // 使用 unwrap: false 保留完整响应结构，便于兼容不同后端返回格式。
        const result = await request({
            url: '/api/login',
            method: 'POST',
            withAuth: false,
            unwrap: false,
            data: requestData,
        });

        const token = extractToken(result);
        const role = normalizeRole(extractRole(result));

        if (!token) {
            throw new Error(t('auth.loginTokenMissing'));
        }

        authStore.setToken(token, { remember: rememberPassword.value });
        authStore.setRole(role, { remember: rememberPassword.value });

        // 当前认证 store 默认持久化 token。
        clearLoginCaptchaState();
        ElMessage.success(t('auth.loginSuccess'));
        await router.push('/dashboard');
    } catch (error) {
        const payload =
            error?.payload && typeof error.payload === 'object' && error.payload !== null
                ? error.payload
                : {};
        const needCaptcha = Boolean(payload.need_captcha);
        const failCount = Number(payload.fail_count);
        const rawErrorMessage = payload?.msg || error?.message || '';

        if (Number.isFinite(failCount)) {
            loginFailCount.value = failCount;
        }

        let captchaRefreshed = false;

        if (needCaptcha) {
            loginNeedCaptcha.value = true;

            try {
                await refreshLoginCaptcha({ silent: true });
                captchaRefreshed = true;
            } catch {
                // 保持显示验证码区域，允许用户手动点击刷新。
            }
        }

        if (loginNeedCaptcha.value && isCaptchaErrorMessage(rawErrorMessage)) {
            loginCaptchaCode.value = '';

            if (!captchaRefreshed) {
                try {
                    await refreshLoginCaptcha({ silent: true });
                } catch {
                    // 刷新失败时由通用错误提示兜底。
                }
            }
        }

        shakeSignal.value += 1;
        ElMessage.error(resolveAuthErrorMessage(error, 'auth.loginFailed'));
    } finally {
        loading.value = false;
    }
}

async function fetchHitokoto() {
    try {
        const response = await fetch('https://v1.hitokoto.cn/?encode=json');
        const payload = await response.json();

        hitokoto.value = payload?.hitokoto || t('auth.fallbackQuote');
        hitokotoFrom.value = payload?.from || '';
    } catch {
        hitokoto.value = t('auth.fallbackQuote');
        hitokotoFrom.value = t('auth.fallbackFrom');
    }
}

function goToRegister() {
    router.push('/register');
}

function handleFieldFocus(field) {
    activeField.value = field;
}

function handleFieldBlur() {
    activeField.value = '';
}

onMounted(() => {
    fetchHitokoto();
});
</script>

<template>
    <div class="auth-page">
        <button class="auth-locale-button" type="button" @click="toggleLocale">
            {{ t('common.switchTo') }}
        </button>

        <div class="auth-shell">
            <section class="auth-visual-panel">
                <h1 class="auth-visual-title">{{ t('auth.appTitle') }}</h1>
                <AuthQuoteCard :quote="hitokoto" :from="hitokotoFrom" />
                <AuthAnimatedCharacters
                    :active-field="activeField"
                    :show-password="showPassword"
                    :password-length="passwordLength"
                    :shake-signal="shakeSignal"
                />
            </section>

            <section class="auth-form-panel">
                <div class="auth-brand">
                    <h2 class="auth-welcome-title">{{ t('auth.loginTitle') }}</h2>
                    <p class="auth-head-sub">{{ t('auth.loginSubtitle') }}</p>
                </div>

                <form class="auth-form" @submit.prevent="handleLogin">
                    <label class="auth-label" for="login-username">{{ t('auth.username') }}</label>
                    <input
                        id="login-username"
                        v-model="loginForm.username"
                        :placeholder="t('auth.username')"
                        autocomplete="username"
                        class="auth-native-input"
                        type="text"
                        @focus="handleFieldFocus('username')"
                        @blur="handleFieldBlur"
                    />

                    <label class="auth-label" for="login-password">{{ t('auth.password') }}</label>
                    <div class="auth-password-wrap">
                        <input
                            id="login-password"
                            v-model="loginForm.password"
                            :placeholder="t('auth.password')"
                            :type="showPassword ? 'text' : 'password'"
                            autocomplete="current-password"
                            class="auth-native-input"
                            @focus="handleFieldFocus('password')"
                            @blur="handleFieldBlur"
                            @keyup.enter="handleLogin"
                        />
                        <button
                            class="auth-ghost-toggle"
                            type="button"
                            @click="showPassword = !showPassword"
                        >
                            <el-icon>
                                <Hide v-if="showPassword" />
                                <View v-else />
                            </el-icon>
                        </button>
                    </div>

                    <div class="auth-captcha-slot" :class="{ 'is-hidden': !loginNeedCaptcha }">
                        <label class="auth-label" for="login-captcha">{{
                            t('auth.captchaLabel')
                        }}</label>
                        <div class="auth-captcha-row">
                            <input
                                id="login-captcha"
                                v-model="loginCaptchaCode"
                                :placeholder="t('auth.captchaPlaceholder')"
                                :disabled="!loginNeedCaptcha"
                                autocomplete="off"
                                class="auth-native-input"
                                maxlength="8"
                                type="text"
                                @focus="handleFieldFocus('captcha')"
                                @blur="handleFieldBlur"
                                @keyup.enter="handleLogin"
                            />
                            <button
                                class="auth-captcha-image-button"
                                type="button"
                                :disabled="!loginNeedCaptcha || loginCaptchaLoading"
                                @click="refreshLoginCaptcha"
                            >
                                <img
                                    v-if="loginCaptchaImage"
                                    :src="loginCaptchaImage"
                                    :alt="t('auth.captchaImageAlt')"
                                    class="auth-captcha-image"
                                />
                                <span v-else class="auth-captcha-fallback">{{
                                    t('auth.captchaLoading')
                                }}</span>
                            </button>
                        </div>
                        <p class="auth-captcha-tip">{{ t('auth.captchaHintClick') }}</p>
                    </div>

                    <button class="auth-primary-button" type="submit" :disabled="loading">
                        <span v-if="loading">{{ t('auth.submitting') }}</span>
                        <span v-else>{{ t('auth.loginButton') }}</span>
                    </button>

                    <div class="auth-extra-row">
                        <label class="auth-check-wrap">
                            <input v-model="rememberPassword" type="checkbox" />
                            <span>{{ t('auth.rememberPassword') }}</span>
                        </label>
                        <a href="#" class="auth-link" @click.prevent="goToRegister">{{
                            t('auth.createAccount')
                        }}</a>
                    </div>
                </form>
            </section>
        </div>
    </div>
</template>
