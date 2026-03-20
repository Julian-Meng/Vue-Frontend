<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminApi, userApi } from '../../../apis'

const props = defineProps({
  role: { type: String, default: 'user' },
})

const { t } = useI18n()

const loading = ref(false)
const prompt = ref('')
const responseText = ref('')
const error = ref('')

function toPrettyText(value) {
  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

async function submitPrompt() {
  if (!prompt.value.trim()) {
    return
  }

  loading.value = true
  error.value = ''

  try {
    const params = { query: prompt.value.trim() }
    const result = props.role === 'admin'
      ? await adminApi.analyzeAdminDashboard(undefined, params)
      : await userApi.analyzeUserDashboard(undefined, params)

    responseText.value = toPrettyText(result)
  } catch (e) {
    error.value = e?.message || t('dashboard.ai.error')
    responseText.value = ''
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <h2 class="panel-title">{{ t('dashboard.nav.ai') }}</h2>
        <p class="panel-sub">{{ t('dashboard.ai.sub') }}</p>
      </div>
    </div>

    <div class="chat-card fade-in">
      <textarea
        v-model="prompt"
        class="input prompt"
        :placeholder="t('dashboard.ai.placeholder')"
        rows="5"
      />

      <div class="toolbar">
        <button class="btn btn-primary" :disabled="loading || !prompt.trim()" @click="submitPrompt">
          {{ loading ? t('dashboard.ai.asking') : t('dashboard.ai.ask') }}
        </button>
      </div>

      <div v-if="error" class="tip error">{{ error }}</div>
      <pre v-else-if="responseText" class="result">{{ responseText }}</pre>
      <div v-else class="tip">{{ t('dashboard.ai.empty') }}</div>
    </div>
  </div>
</template>

<style scoped>
@import '../../styles/panel-common.css';
@import '../../styles/dashboard-pages.css';

.chat-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  transition: var(--transition-base);
}

.chat-card:hover {
  box-shadow: var(--shadow-md);
}

.prompt {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  min-height: 130px;
  border: 1px solid var(--color-border);
}

.result {
  margin: 0;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
  max-height: 500px;
  overflow-y: auto;
}
</style>
