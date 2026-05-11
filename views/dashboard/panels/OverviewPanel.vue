<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
    role: { type: String, default: 'user' },
    dashboardData: { type: Object, default: null },
    recentNotices: { type: Array, default: () => [] },
});
const emit = defineEmits(['open-tab']);
const { t, locale } = useI18n();

const roleLabel = computed(() =>
    props.role === 'admin' ? t('dashboard.roleAdmin') : t('dashboard.roleUser')
);

const weatherLoading = ref(false);
const weatherError = ref('');
const weather = ref({
    province: '-',
    city: '-',
    district: '-',
    weather: '--',
    temperature: '--',
    windDirection: '--',
    windPower: '--',
    humidity: '--',
    reportTime: '--',
});

const now = ref(new Date());
const weekdayLabels = computed(() => [
    t('dashboard.overview.weekdaySun'),
    t('dashboard.overview.weekdayMon'),
    t('dashboard.overview.weekdayTue'),
    t('dashboard.overview.weekdayWed'),
    t('dashboard.overview.weekdayThu'),
    t('dashboard.overview.weekdayFri'),
    t('dashboard.overview.weekdaySat'),
]);

const monthTitle = computed(() => {
    const formatter = new Intl.DateTimeFormat(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'long',
    });
    return formatter.format(now.value);
});

const calendarCells = computed(() => {
    const year = now.value.getFullYear();
    const month = now.value.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const cells = [];
    for (let i = 0; i < firstDay; i += 1) {
        cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const isToday =
            today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

        cells.push({ day, isToday });
    }

    while (cells.length % 7 !== 0) {
        cells.push(null);
    }

    return cells;
});

function pickStat(keywords, fallback = 0) {
    if (!props.dashboardData || typeof props.dashboardData !== 'object') {
        return fallback;
    }

    const entries = Object.entries(props.dashboardData);

    for (const [key, value] of entries) {
        const lowerKey = key.toLowerCase();
        const matched = keywords.some((word) => lowerKey.includes(word));

        if (matched && (typeof value === 'number' || typeof value === 'string')) {
            return value;
        }
    }

    return fallback;
}

function formatMetricValue(value) {
    if (typeof value === 'number') {
        return new Intl.NumberFormat(locale.value).format(value);
    }

    if (value === null || value === undefined || value === '') {
        return '--';
    }

    return String(value);
}

const metricCards = computed(() => [
    {
        key: 'employees',
        label: t('dashboard.overview.metrics.employees'),
        value: formatMetricValue(pickStat(['employee', 'staff', 'personnel', 'user_count'], 0)),
        tone: 'primary',
    },
    {
        key: 'approvals',
        label: t('dashboard.overview.metrics.approvals'),
        value: formatMetricValue(pickStat(['pending', 'approval', 'review', 'audit'], 0)),
        tone: 'warning',
    },
    {
        key: 'departments',
        label: t('dashboard.overview.metrics.departments'),
        value: formatMetricValue(pickStat(['department', 'dept'], 0)),
        tone: 'info',
    },
    {
        key: 'notices',
        label: t('dashboard.overview.metrics.notices'),
        value: formatMetricValue(pickStat(['notice', 'announcement'], props.recentNotices.length)),
        tone: 'success',
    },
    {
        key: 'attendance',
        label: t('dashboard.overview.metrics.attendanceToday'),
        value: formatMetricValue(pickStat(['attendance', 'checkin', 'check_in'], 0)),
        tone: 'danger',
    },
]);

function openNoticePanel() {
    emit('open-tab', 'notice');
}

async function fetchWeather() {
    weatherLoading.value = true;
    weatherError.value = '';

    try {
        const response = await fetch('https://uapis.cn/api/v1/misc/weather');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload;

        weather.value = {
            province: data?.province || '-',
            city: data?.city || '-',
            district: data?.district || '-',
            weather: data?.weather || '--',
            temperature: data?.temperature ?? '--',
            windDirection: data?.wind_direction || '--',
            windPower: data?.wind_power || '--',
            humidity: data?.humidity ?? '--',
            reportTime: data?.report_time || '--',
        };
    } catch (error) {
        weatherError.value = error?.message || t('dashboard.overview.weatherLoadFailed');
    } finally {
        weatherLoading.value = false;
    }
}

onMounted(fetchWeather);
</script>

<template>
    <div class="panel-wrapper overview-layout">
        <header class="overview-hero">
            <div class="hero-copy">
                <span class="role-pill">{{ roleLabel }}</span>
                <h2 class="hero-title">{{ t('dashboard.overview.title') }}</h2>
                <p class="hero-sub">
                    {{
                        role === 'admin'
                            ? t('dashboard.overview.adminSub')
                            : t('dashboard.overview.userSub')
                    }}
                </p>
            </div>
            <div class="hero-actions">
                <button class="btn btn-secondary" @click="fetchWeather">
                    {{ t('dashboard.overview.refreshWeather') }}
                </button>
                <button class="btn btn-primary" @click="openNoticePanel">
                    {{ t('dashboard.overview.viewNotices') }}
                </button>
            </div>
        </header>

        <div class="overview-main">
            <section class="overview-column main-left">
                <article class="overview-card metric-board">
                    <div class="card-header">
                        <div>
                            <h3>{{ t('dashboard.overview.metricsTitle') }}</h3>
                            <p class="card-sub">{{ t('dashboard.overview.metricsSub') }}</p>
                        </div>
                        <span class="card-note">{{ t('dashboard.overview.metricsNote') }}</span>
                    </div>
                    <div class="metric-grid">
                        <article
                            v-for="item in metricCards"
                            :key="item.key"
                            class="metric-card"
                            :class="`tone-${item.tone}`"
                        >
                            <div class="metric-card-top">
                                <span
                                    class="metric-icon"
                                    :class="`tone-${item.tone}`"
                                    aria-hidden="true"
                                ></span>
                                <span class="metric-label">{{ item.label }}</span>
                            </div>
                            <div class="metric-value">{{ item.value }}</div>
                        </article>
                    </div>
                </article>

                <article class="overview-card notice-board">
                    <div class="card-header">
                        <div>
                            <h3>{{ t('dashboard.overview.latestNotices') }}</h3>
                            <p class="card-sub">{{ t('dashboard.overview.noticeSub') }}</p>
                        </div>
                        <button class="btn btn-ghost" @click="openNoticePanel">
                            {{ t('dashboard.overview.viewNotices') }}
                        </button>
                    </div>
                    <div v-if="recentNotices.length === 0" class="card-tip">
                        {{ t('dashboard.overview.noNotices') }}
                    </div>
                    <ul v-else class="notice-feed">
                        <li
                            v-for="notice in recentNotices.slice(0, 6)"
                            :key="notice.id || notice.title"
                            class="notice-feed-item"
                        >
                            <button
                                class="notice-feed-trigger"
                                type="button"
                                @click="openNoticePanel"
                            >
                                <div class="notice-feed-main">
                                    <strong class="notice-feed-title">{{ notice.title }}</strong>
                                    <p class="notice-feed-summary">
                                        {{ notice.summary || notice.content || '-' }}
                                    </p>
                                </div>
                                <span class="notice-feed-time">{{
                                    notice.createdAtText || '-'
                                }}</span>
                            </button>
                        </li>
                    </ul>
                </article>
            </section>

            <section class="overview-column main-right">
                <article class="overview-card weather-card">
                    <div class="card-header">
                        <div>
                            <h3>{{ t('dashboard.overview.weatherTitle') }}</h3>
                            <p class="card-sub">
                                {{ weather.province }} {{ weather.city }} {{ weather.district }}
                            </p>
                        </div>
                        <span class="card-note">{{ weather.reportTime }}</span>
                    </div>
                    <div v-if="weatherLoading" class="card-tip">
                        {{ t('dashboard.overview.weatherLoading') }}
                    </div>
                    <div v-else-if="weatherError" class="card-tip error">{{ weatherError }}</div>
                    <div v-else class="weather-body">
                        <div class="weather-primary">
                            <span class="temperature">{{ weather.temperature }}°C</span>
                            <span class="weather-type">{{ weather.weather }}</span>
                        </div>
                        <div class="weather-meta">
                            <div class="weather-meta-item">
                                <span class="weather-meta-label">
                                    {{ t('dashboard.overview.windDirection') }}
                                </span>
                                <span class="weather-meta-value">
                                    {{ weather.windDirection }}
                                </span>
                            </div>
                            <div class="weather-meta-item">
                                <span class="weather-meta-label">
                                    {{ t('dashboard.overview.windPower') }}
                                </span>
                                <span class="weather-meta-value">{{ weather.windPower }}</span>
                            </div>
                            <div class="weather-meta-item">
                                <span class="weather-meta-label">
                                    {{ t('dashboard.overview.humidity') }}
                                </span>
                                <span class="weather-meta-value">{{ weather.humidity }}%</span>
                            </div>
                        </div>
                    </div>
                </article>

                <article class="overview-card calendar-card">
                    <div class="card-header">
                        <div>
                            <h3>{{ t('dashboard.overview.calendarTitle') }}</h3>
                            <p class="card-sub">{{ monthTitle }}</p>
                        </div>
                    </div>
                    <div class="calendar-grid weekday">
                        <span v-for="day in weekdayLabels" :key="`week-${day}`">{{ day }}</span>
                    </div>
                    <div class="calendar-grid dates">
                        <span
                            v-for="(cell, idx) in calendarCells"
                            :key="`day-${idx}`"
                            :class="['date-cell', { empty: !cell, today: cell?.isToday }]"
                        >
                            {{ cell?.day || '' }}
                        </span>
                    </div>
                </article>
            </section>
        </div>
    </div>
</template>

<style scoped>
@import '../../styles/panel-common.css';
@import '../../styles/overview-panel.css';
</style>
