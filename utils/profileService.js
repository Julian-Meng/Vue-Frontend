import { adminApi, userApi } from '../apis';

export const PROFILE_EDITABLE_FIELDS = [
    'name',
    'sex',
    'birth',
    'job',
    'addr',
    'tel',
    'email',
    'remark',
];

const EDITABLE_ALIAS_TO_CANONICAL = {
    name: 'name',
    sex: 'sex',
    gender: 'sex',
    birth: 'birth',
    hire_date: 'birth',
    job: 'job',
    position: 'job',
    addr: 'addr',
    address: 'addr',
    tel: 'tel',
    phone: 'tel',
    email: 'email',
    remark: 'remark',
};

function normalizeDepartmentValue(value) {
    if (value === undefined || value === null || value === '') {
        return '';
    }

    if (typeof value === 'object') {
        return (
            value.name ||
            value.department_name ||
            value.dept_name ||
            (value.id !== undefined ? String(value.id) : '')
        );
    }

    return String(value);
}

function normalizeBirthValue(value) {
    if (value instanceof Date) {
        return value.toISOString();
    }

    const text = String(value ?? '').trim();
    if (!text) {
        return undefined;
    }

    // Normalize yyyy-mm-dd from date input to RFC3339 for Go time parser.
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return `${text}T00:00:00Z`;
    }

    return text;
}

function normalizeEditableValue(field, value) {
    if (value === undefined) {
        return undefined;
    }

    if (field === 'birth') {
        return normalizeBirthValue(value);
    }

    if (typeof value === 'string') {
        return value.trim();
    }

    return value;
}

function diffEditablePayload(nextPayload, prevPayload) {
    const changed = {};

    PROFILE_EDITABLE_FIELDS.forEach((field) => {
        if (!Object.prototype.hasOwnProperty.call(nextPayload, field)) {
            return;
        }

        const nextValue = nextPayload[field];
        const prevValue = prevPayload[field];

        if (nextValue !== prevValue) {
            changed[field] = nextValue;
        }
    });

    return changed;
}

export function normalizeProfile(rawProfile) {
    if (!rawProfile || typeof rawProfile !== 'object') {
        return null;
    }

    const normalized = { ...rawProfile };

    normalized.id = rawProfile.id ?? rawProfile.user_id ?? null;
    normalized.user_id = rawProfile.user_id ?? rawProfile.id ?? null;
    normalized.emp_id = rawProfile.emp_id ?? rawProfile.employee_id ?? '';
    normalized.name = rawProfile.name ?? rawProfile.real_name ?? '';
    normalized.sex = rawProfile.sex ?? rawProfile.gender ?? '';
    normalized.gender = normalized.sex;
    normalized.birth = rawProfile.birth ?? rawProfile.hire_date ?? rawProfile.entry_date ?? '';
    normalized.phone = rawProfile.tel ?? rawProfile.phone ?? rawProfile.mobile ?? '';
    normalized.tel = normalized.phone;
    normalized.email = rawProfile.email ?? '';
    normalized.department = normalizeDepartmentValue(
        rawProfile.department ?? rawProfile.dept ?? rawProfile.dpt_name ?? rawProfile.dpt_id
    );
    normalized.position = rawProfile.job ?? rawProfile.position ?? '';
    normalized.job = normalized.position;
    normalized.hire_date = normalized.birth;
    normalized.status = rawProfile.status ?? rawProfile.state ?? '';
    normalized.address = rawProfile.addr ?? rawProfile.address ?? rawProfile.location ?? '';
    normalized.addr = normalized.address;
    normalized.remark = rawProfile.remark ?? '';

    return normalized;
}

export function buildEditablePayload(formData) {
    const payload = {};

    Object.entries(EDITABLE_ALIAS_TO_CANONICAL).forEach(([rawKey, canonicalKey]) => {
        if (Object.prototype.hasOwnProperty.call(formData || {}, rawKey)) {
            payload[canonicalKey] = formData[rawKey];
        }
    });

    PROFILE_EDITABLE_FIELDS.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(formData || {}, field)) {
            payload[field] = formData[field];
        }
    });

    Object.keys(payload).forEach((key) => {
        payload[key] = normalizeEditableValue(key, payload[key]);

        if (!PROFILE_EDITABLE_FIELDS.includes(key) || payload[key] === undefined) {
            delete payload[key];
        }
    });

    return payload;
}

export async function fetchMyProfile() {
    const profile = await userApi.getMyProfile();
    return normalizeProfile(profile);
}

export async function fetchProfileByEmpId(empId) {
    const normalizedEmpId = String(empId || '').trim();
    if (!normalizedEmpId) {
        throw new Error('emp_id is required');
    }

    const profile = await adminApi.getPersonProfile(undefined, normalizedEmpId);
    return normalizeProfile(profile);
}

export async function saveProfileByRole({ targetProfile, formData, isSelf = false } = {}) {
    const normalizedTarget = normalizeProfile(targetProfile);
    const targetId = normalizedTarget?.id ?? normalizedTarget?.user_id;
    const nextPayload = buildEditablePayload(formData || {});
    const prevPayload = buildEditablePayload(normalizedTarget || {});
    const payload = diffEditablePayload(nextPayload, prevPayload);

    if (Object.keys(payload).length === 0) {
        throw new Error('至少提供一个可更新字段');
    }

    let updated;

    if (isSelf) {
        try {
            updated = await userApi.updateMyProfile(undefined, payload);
        } catch (err) {
            if (Number(err?.status ?? 0) === 404 && targetId) {
                updated = await userApi.updateUserProfileById(undefined, targetId, payload);
            } else {
                throw err;
            }
        }

        return normalizeProfile({ ...(normalizedTarget || {}), ...(updated || {}), ...payload });
    }

    if (!targetId) {
        throw new Error('Target profile id is required');
    }

    updated = await userApi.updateUserProfileById(undefined, targetId, payload);

    return normalizeProfile({ ...(normalizedTarget || {}), ...(updated || {}), ...payload });
}
