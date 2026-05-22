const DEFAULT_ROLE_CHANGE_REQUIRED_ROLE = 'superadmin';
const ROLE_CHANGE_REQUIRED_ROLE_ENV_KEY = 'VITE_ACCOUNT_ROLE_CHANGE_REQUIRED_ROLE';

export function normalizeRole(role) {
    const normalized = String(role ?? '')
        .trim()
        .toLowerCase();

    if (normalized === 'user') {
        return 'staff';
    }

    return normalized;
}

export function isSuperadmin(role) {
    return normalizeRole(role) === 'superadmin';
}

export function isAdminLike(role) {
    const normalized = normalizeRole(role);
    return normalized === 'admin' || normalized === 'superadmin';
}

export function isStaff(role) {
    const normalized = normalizeRole(role);
    return normalized === 'staff' || normalized === 'user';
}

export function getRoleChangeRequiredRole() {
    const raw = normalizeRole(import.meta.env[ROLE_CHANGE_REQUIRED_ROLE_ENV_KEY]);
    if (raw === 'admin') {
        return 'admin';
    }
    return DEFAULT_ROLE_CHANGE_REQUIRED_ROLE;
}

export function canChangeAccountRole(actorRole) {
    const requiredRole = getRoleChangeRequiredRole();
    if (requiredRole === 'admin') {
        return isAdminLike(actorRole);
    }
    return isSuperadmin(actorRole);
}
