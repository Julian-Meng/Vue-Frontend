import { i18n } from './i18n';

const TIME_ONLY_PATTERN = /^\d{1,2}:\d{2}(:\d{2})?$/;

function padNumber(value) {
    return String(value).padStart(2, '0');
}

function resolvePattern(key, fallback) {
    const t = i18n?.global?.t;
    if (typeof t !== 'function') {
        return fallback;
    }

    const pattern = t(key);
    return typeof pattern === 'string' && pattern.trim() ? pattern : fallback;
}

function normalizeDateInput(value) {
    if (value instanceof Date) {
        const date = new Date(value.getTime());
        return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    const text = String(value ?? '').trim();
    if (!text || TIME_ONLY_PATTERN.test(text)) {
        return null;
    }

    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
}

function formatWithPattern(date, pattern) {
    const tokens = {
        YYYY: String(date.getFullYear()),
        MM: padNumber(date.getMonth() + 1),
        DD: padNumber(date.getDate()),
        HH: padNumber(date.getHours()),
        mm: padNumber(date.getMinutes()),
        ss: padNumber(date.getSeconds()),
    };

    return pattern.replace(/YYYY|MM|DD|HH|mm|ss/g, (token) => tokens[token] || token);
}

export function formatDate(value, { fallback = '-' } = {}) {
    const date = normalizeDateInput(value);
    if (!date) {
        return fallback;
    }

    const pattern = resolvePattern('common.dateFormat', 'YYYY-MM-DD');
    return formatWithPattern(date, pattern);
}

export function formatDateTime(value, { fallback = '-' } = {}) {
    const text = String(value ?? '').trim();
    if (!text) {
        return fallback;
    }

    if (TIME_ONLY_PATTERN.test(text)) {
        return text;
    }

    const date = normalizeDateInput(text);
    if (!date) {
        return fallback;
    }

    const pattern = resolvePattern('common.dateTimeFormat', 'YYYY-MM-DD HH:mm');
    return formatWithPattern(date, pattern);
}
