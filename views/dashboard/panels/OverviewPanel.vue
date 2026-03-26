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

const metricCards = computed(() => [
    {
        key: 'employees',
        label: t('dashboard.overview.metrics.employees'),
        value: pickStat(['employee', 'staff', 'personnel', 'user_count'], 0),
    },
    {
        key: 'approvals',
        label: t('dashboard.overview.metrics.approvals'),
        value: pickStat(['pending', 'approval', 'review', 'audit'], 0),
    },
    {
        key: 'departments',
        label: t('dashboard.overview.metrics.departments'),
        value: pickStat(['department', 'dept'], 0),
    },
    {
        key: 'notices',
        label: t('dashboard.overview.metrics.notices'),
        value: pickStat(['notice', 'announcement'], props.recentNotices.length),
    },
    {
        key: 'attendance',
        label: t('dashboard.overview.metrics.attendanceToday'),
        value: pickStat(['attendance', 'checkin', 'check_in'], 0),
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
        <h2 class="panel-title">{{ t('dashboard.overview.title') }}</h2>
        <p class="panel-sub">
            {{
                role === 'admin'
                    ? t('dashboard.overview.adminSub')
                    : t('dashboard.overview.userSub')
            }}
        </p>

        <section class="overview-row top-row">
            <article class="overview-block weather-block">
                <div class="block-head">
                    <h3>{{ t('dashboard.overview.weatherTitle') }}</h3>
                    <span class="weather-time">{{ weather.reportTime }}</span>
                </div>
                <div v-if="weatherLoading" class="block-tip">
                    {{ t('dashboard.overview.weatherLoading') }}
                </div>
                <div v-else-if="weatherError" class="block-tip error">{{ weatherError }}</div>
                <div v-else class="weather-content">
                    <div class="weather-main">
                        <span class="temperature">{{ weather.temperature }}°C</span>
                        <span class="weather-type">{{ weather.weather }}</span>
                    </div>
                    <p class="weather-location">
                        {{ weather.province }} {{ weather.city }} {{ weather.district }}
                    </p>
                    <p class="weather-meta">
                        <span
                            >{{ t('dashboard.overview.windDirection') }}:
                            {{ weather.windDirection }}</span
                        >
                        <span
                            >{{ t('dashboard.overview.windPower') }}: {{ weather.windPower }}</span
                        >
                        <span>{{ t('dashboard.overview.humidity') }}: {{ weather.humidity }}%</span>
                    </p>
                </div>
            </article>

            <article class="overview-block calendar-block">
                <div class="block-head">
                    <h3>{{ t('dashboard.overview.calendarTitle') }}</h3>
                    <span class="calendar-month">{{ monthTitle }}</span>
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

        <section class="overview-row stats-row">
            <article v-for="item in metricCards" :key="item.key" class="metric-pill">
                <span class="metric-label">{{ item.label }}</span>
                <strong class="metric-value">{{ item.value }}</strong>
            </article>
        </section>

        <section class="overview-row notice-row overview-block">
            <div class="block-head">
                <h3>{{ t('dashboard.overview.latestNotices') }}</h3>
            </div>
            <div v-if="recentNotices.length === 0" class="block-tip">
                {{ t('dashboard.overview.noNotices') }}
            </div>
            <ul v-else class="notice-list">
                <li
                    v-for="notice in recentNotices.slice(0, 6)"
                    :key="notice.id || notice.title"
                    class="overview-notice-item"
                    @click="openNoticePanel"
                >
                    <div class="overview-notice-main">
                        <strong class="overview-notice-title">{{ notice.title }}</strong>
                        <p class="overview-notice-summary">
                            {{ notice.summary || notice.content || '-' }}
                        </p>
                    </div>
                    <span class="overview-notice-time">{{ notice.createdAtText || '-' }}</span>
                </li>
            </ul>
        </section>
    </div>
</template>

<style scoped>
.overview-layout {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.overview-row {
    width: 100%;
}

.top-row {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 16px;
}

.overview-block {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
    padding: 16px;
}

.block-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
}

.block-head h3 {
    margin: 0;
    font-size: 16px;
    color: #0f172a;
}

.weather-time,
.calendar-month {
    color: #64748b;
    font-size: 12px;
}

.block-tip {
    color: #64748b;
    font-size: 13px;
}

.block-tip.error {
    color: #dc2626;
}

.weather-main {
    display: flex;
    align-items: baseline;
    gap: 10px;
}

.temperature {
    font-size: 30px;
    font-weight: 700;
    color: #2563eb;
}

.weather-type {
    font-size: 15px;
    color: #334155;
    font-weight: 600;
}

.weather-location {
    margin: 8px 0 0;
    color: #0f172a;
    font-size: 14px;
}

.weather-meta {
    margin: 10px 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    font-size: 13px;
    color: #475569;
}

.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
}

.calendar-grid.weekday span {
    text-align: center;
    color: #64748b;
    font-size: 12px;
}

.date-cell {
    height: 30px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: #334155;
    background: #f8fafc;
}

.date-cell.empty {
    background: transparent;
}

.date-cell.today {
    background: #dbeafe;
    color: #1d4ed8;
    font-weight: 700;
}

.stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
}

.metric-pill {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.metric-label {
    color: #64748b;
    font-size: 13px;
}

.metric-value {
    color: #0f172a;
    font-size: 22px;
    line-height: 1;
}

.notice-row {
    min-height: 260px;
}

.notice-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.overview-notice-item {
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 12px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    cursor: pointer;
}

.overview-notice-main {
    min-width: 0;
    flex: 1;
}

.overview-notice-title {
    color: #0f172a;
    font-size: 14px;
}

.overview-notice-summary {
    margin: 4px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.5;
}

.overview-notice-time {
    flex-shrink: 0;
    color: #94a3b8;
    font-size: 12px;
}

@media (max-width: 1100px) {
    .top-row {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .metric-value {
        font-size: 18px;
    }

    .overview-notice-item {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>
