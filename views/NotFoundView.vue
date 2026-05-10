<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { getStoredToken } from '../apis/request';
import { toggleLocale } from '../utils/i18n';
import AuthAnimatedCharacters from './components/AuthAnimatedCharacters.vue';
import AuthQuoteCard from './components/AuthQuoteCard.vue';
import './styles/auth-pages.css';

const router = useRouter();
const { t } = useI18n();

const hasToken = computed(() => Boolean(getStoredToken()));
const primaryButtonText = computed(() =>
    hasToken.value ? t('notFound.primaryGoDashboard') : t('notFound.primaryGoLogin')
);

function goPrimary() {
    router.push(hasToken.value ? '/dashboard' : '/login');
}

function goBack() {
    if (window.history.length > 1) {
        router.back();
        return;
    }

    goPrimary();
}
</script>

<template>
    <div class="auth-page not-found-page">
        <button class="auth-locale-button" type="button" @click="toggleLocale">
            {{ t('common.switchTo') }}
        </button>

        <div class="auth-shell">
            <section class="auth-visual-panel">
                <h1 class="auth-visual-title">{{ t('auth.appTitle') }}</h1>
                <AuthQuoteCard
                    :quote="t('notFound.visualQuote')"
                    :from="t('notFound.visualFrom')"
                />
                <AuthAnimatedCharacters />
            </section>

            <section class="auth-form-panel">
                <div class="auth-brand">
                    <p class="not-found-code">404</p>
                    <h2 class="auth-welcome-title">{{ t('notFound.title') }}</h2>
                    <p class="auth-head-sub">{{ t('notFound.subtitle') }}</p>
                </div>

                <div class="not-found-actions">
                    <button class="auth-primary-button" type="button" @click="goPrimary">
                        {{ primaryButtonText }}
                    </button>
                    <button class="not-found-secondary-button" type="button" @click="goBack">
                        {{ t('notFound.secondaryBack') }}
                    </button>
                </div>
            </section>
        </div>
    </div>
</template>

<style scoped>
.not-found-code {
    margin: 0;
    font-size: clamp(56px, 8vw, 88px);
    font-weight: 800;
    letter-spacing: 0.08em;
    line-height: 1;
}

.not-found-actions {
    display: grid;
    gap: 12px;
    width: min(360px, 100%);
    margin: 0 auto;
}

.not-found-secondary-button {
    width: 100%;
    height: 44px;
    border-radius: 10px;
    border: 1px solid #d8d8d8;
    background: #fff;
    color: #333;
    cursor: pointer;
}

.not-found-secondary-button:hover {
    border-color: #b8b8b8;
    background: #fafafa;
}
</style>
