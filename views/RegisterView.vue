<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Hide, View } from '@element-plus/icons-vue';

import { getCaptcha, register } from '../apis/public';
import { toggleLocale } from '../utils/i18n';
import AuthAnimatedCharacters from './components/AuthAnimatedCharacters.vue';
import AuthQuoteCard from './components/AuthQuoteCard.vue';
import './styles/auth-pages.css';

const router = useRouter();
const { t } = useI18n();

const loading = ref(false);
const activeField = ref('');
const showPassword = ref(false);
const hitokoto = ref(t('auth.loadingQuote'));
const hitokotoFrom = ref('');
const registerCaptchaId = ref('');
const registerCaptchaCode = ref('');
const registerCaptchaImage = ref('');
const registerCaptchaLoading = ref(false);

const passwordLength = computed(() => registerForm.password.length);

const registerForm = reactive({
    username: '',
    password: '',
    confirmPassword: '',
    role: 'staff',
});

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

function isCaptchaErrorMessage(message) {
    return /验证码错误或已过期|captcha/i.test(String(message || '').trim());
}

async function refreshRegisterCaptcha({ silent = false } = {}) {
    registerCaptchaLoading.value = true;

    try {
        const payload = await getCaptcha({ scene: 'register' });

        registerCaptchaId.value = payload?.captcha_id || '';
        registerCaptchaImage.value = payload?.image_base64 || '';

        if (!registerCaptchaId.value || !registerCaptchaImage.value) {
            throw new Error(t('auth.captchaLoadFailed'));
        }
    } catch (error) {
        registerCaptchaId.value = '';
        registerCaptchaImage.value = '';

        if (!silent) {
            ElMessage.error(resolveAuthErrorMessage(error, 'auth.captchaLoadFailed'));
        }

        throw error;
    } finally {
        registerCaptchaLoading.value = false;
    }
}

async function handleRegister() {
    const username = registerForm.username.trim();
    const password = registerForm.password;
    const confirmPassword = registerForm.confirmPassword;

    if (!username || !password) {
        ElMessage.warning(t('auth.loginMissingFields'));
        return;
    }

    if (password !== confirmPassword) {
        ElMessage.warning(t('auth.registerPasswordMismatch'));
        return;
    }

    if (!registerCaptchaCode.value.trim()) {
        ElMessage.warning(t('auth.captchaMissing'));
        return;
    }

    if (!registerCaptchaId.value) {
        try {
            await refreshRegisterCaptcha();
        } catch {
            return;
        }
    }

    loading.value = true;
    let shouldRedirect = false;

    try {
        await register({
            username,
            password,
            role: registerForm.role,
            captcha_id: registerCaptchaId.value,
            captcha_code: registerCaptchaCode.value.trim(),
        });

        shouldRedirect = true;
        registerForm.password = '';
        registerForm.confirmPassword = '';
        registerCaptchaCode.value = '';
        ElMessage.success(t('auth.registerSuccess'));
    } catch (error) {
        if (isCaptchaErrorMessage(error?.payload?.msg || error?.message)) {
            registerCaptchaCode.value = '';
        }

        ElMessage.error(resolveAuthErrorMessage(error, 'auth.registerFailed'));
    } finally {
        try {
            await refreshRegisterCaptcha({ silent: true });
        } catch {
            // 刷新失败时保留当前页面状态，用户可手动点击图片重试。
        }

        loading.value = false;

        if (shouldRedirect) {
            await router.push('/login');
        }
    }
}

function goToLogin() {
    router.push('/login');
}

function handleFieldFocus(field) {
    activeField.value = field;
}

function handleFieldBlur() {
    activeField.value = '';
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

onMounted(() => {
    fetchHitokoto();
    refreshRegisterCaptcha({ silent: true });
});
</script>

<template>
    <div class="auth-page">
        <button class="auth-locale-button" type="button" @click="toggleLocale">
            {{ t('common.switchTo') }}
        </button>

        <div class="auth-shell">
            <section class="auth-visual-panel">
                <h1 class="auth-visual-title">Vue CMS</h1>
                <AuthQuoteCard :quote="hitokoto" :from="hitokotoFrom" />
                <AuthAnimatedCharacters
                    :active-field="activeField"
                    :show-password="showPassword"
                    :password-length="passwordLength"
                />
            </section>

            <section class="auth-form-panel auth-form-panel-register">
                <div class="auth-brand">
                    <h2 class="auth-welcome-title">{{ t('auth.registerTitle') }}</h2>
                    <p class="auth-head-sub">{{ t('auth.registerSubtitle') }}</p>
                </div>

                <form class="auth-form" @submit.prevent="handleRegister">
                    <div class="auth-role-row">
                        <button
                            class="auth-role-pill"
                            type="button"
                            :class="{ active: registerForm.role === 'staff' }"
                            @click="registerForm.role = 'staff'"
                        >
                            Staff
                        </button>
                        <button
                            class="auth-role-pill"
                            type="button"
                            :class="{ active: registerForm.role === 'admin' }"
                            @click="registerForm.role = 'admin'"
                        >
                            Admin
                        </button>
                    </div>

                    <label class="auth-label" for="register-username">{{
                        t('auth.username')
                    }}</label>
                    <input
                        id="register-username"
                        v-model="registerForm.username"
                        :placeholder="t('auth.username')"
                        autocomplete="username"
                        class="auth-native-input"
                        type="text"
                        @focus="handleFieldFocus('username')"
                        @blur="handleFieldBlur"
                    />

                    <label class="auth-label" for="register-password">{{
                        t('auth.password')
                    }}</label>
                    <div class="auth-password-wrap">
                        <input
                            id="register-password"
                            v-model="registerForm.password"
                            :placeholder="t('auth.password')"
                            :type="showPassword ? 'text' : 'password'"
                            autocomplete="new-password"
                            class="auth-native-input"
                            @focus="handleFieldFocus('password')"
                            @blur="handleFieldBlur"
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

                    <label class="auth-label" for="register-confirm-password">{{
                        t('auth.confirmPassword')
                    }}</label>
                    <input
                        id="register-confirm-password"
                        v-model="registerForm.confirmPassword"
                        :placeholder="t('auth.confirmPassword')"
                        :type="showPassword ? 'text' : 'password'"
                        autocomplete="new-password"
                        class="auth-native-input"
                        @focus="handleFieldFocus('password')"
                        @blur="handleFieldBlur"
                        @keyup.enter="handleRegister"
                    />

                    <div class="auth-captcha-slot">
                        <label class="auth-label" for="register-captcha">{{
                            t('auth.captchaLabel')
                        }}</label>
                        <div class="auth-captcha-row">
                            <input
                                id="register-captcha"
                                v-model="registerCaptchaCode"
                                :placeholder="t('auth.captchaPlaceholder')"
                                autocomplete="off"
                                class="auth-native-input"
                                maxlength="8"
                                type="text"
                                @focus="handleFieldFocus('captcha')"
                                @blur="handleFieldBlur"
                                @keyup.enter="handleRegister"
                            />
                            <button
                                class="auth-captcha-image-button"
                                type="button"
                                :disabled="registerCaptchaLoading"
                                @click="refreshRegisterCaptcha"
                            >
                                <img
                                    v-if="registerCaptchaImage"
                                    :src="registerCaptchaImage"
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
                        <span v-else>{{ t('auth.registerButton') }}</span>
                    </button>

                    <div class="auth-footer-row">
                        <a href="#" class="auth-link" @click.prevent="goToLogin">{{
                            t('auth.registerBackToLogin')
                        }}</a>
                    </div>
                </form>
            </section>
        </div>
    </div>
</template>
