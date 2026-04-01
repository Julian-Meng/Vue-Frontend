import * as XLSX from 'xlsx';

function normalizeCellValue(value) {
    if (value === null || value === undefined) {
        return '';
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (item === null || item === undefined) return '';
                if (typeof item === 'object') return JSON.stringify(item);
                return String(item);
            })
            .join(', ');
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return value;
}

function sanitizeName(name, fallback) {
    const normalized = String(name || '')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '_');

    return normalized || fallback;
}

function buildSheetFromRows(rows, columns = []) {
    const safeRows = Array.isArray(rows) ? rows : [];

    if (columns.length > 0) {
        const headers = columns.map((column) => column.label || column.key);
        const body = safeRows.map((row) =>
            columns.map((column) => {
                const raw =
                    typeof column.formatter === 'function'
                        ? column.formatter(row)
                        : row?.[column.key];

                return normalizeCellValue(raw);
            })
        );

        return XLSX.utils.aoa_to_sheet([headers, ...body]);
    }

    const plainRows = safeRows.map((row) => {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            return { value: normalizeCellValue(row) };
        }

        const normalized = {};
        Object.entries(row).forEach(([key, value]) => {
            normalized[key] = normalizeCellValue(value);
        });
        return normalized;
    });

    return XLSX.utils.json_to_sheet(plainRows);
}

export function exportToExcel(options = {}) {
    const {
        fileName = 'export',
        sheetName = 'Sheet1',
        rows = [],
        columns = [],
        sheets = null,
    } = options;

    const workbook = XLSX.utils.book_new();

    if (Array.isArray(sheets) && sheets.length > 0) {
        sheets.forEach((sheet, index) => {
            const worksheet = buildSheetFromRows(sheet?.rows || [], sheet?.columns || []);
            const name = sanitizeName(sheet?.name, `Sheet${index + 1}`);
            XLSX.utils.book_append_sheet(workbook, worksheet, name);
        });
    } else {
        const worksheet = buildSheetFromRows(rows, columns);
        const name = sanitizeName(sheetName, 'Sheet1');
        XLSX.utils.book_append_sheet(workbook, worksheet, name);
    }

    XLSX.writeFile(workbook, `${sanitizeName(fileName, 'export')}.xlsx`);
}
