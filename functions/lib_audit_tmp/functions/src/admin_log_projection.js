"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TIMESTAMP_FIELDS = void 0;
exports.isRecord = isRecord;
exports.cleanText = cleanText;
exports.millis = millis;
exports.timestampValue = timestampValue;
exports.displayTimestamp = displayTimestamp;
exports.publicObject = publicObject;
exports.encodeTimestampCursor = encodeTimestampCursor;
exports.decodeTimestampCursor = decodeTimestampCursor;
exports.compareTimestampRows = compareTimestampRows;
exports.rowIsAfterCursor = rowIsAfterCursor;
exports.collectTimestampRows = collectTimestampRows;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
exports.DEFAULT_TIMESTAMP_FIELDS = ['timestamp', 'ts', 'createdAt'];
const SENSITIVE_KEY_RE = /(body|reply|finalText|signature|payload|items|message|comment|email)/i;
const MAX_PUBLIC_OBJECT_DEPTH = 2;
const MAX_PUBLIC_OBJECT_KEYS = 12;
const MAX_PUBLIC_STRING_LENGTH = 180;
const CURSOR_RE = /^[A-Za-z0-9_-]{1,500}$/;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function cleanText(value, max = 500) {
    return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function millis(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (typeof value === 'string') {
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    if (isRecord(value)) {
        if (typeof value.toMillis === 'function') {
            try {
                return Number(value.toMillis()) || 0;
            }
            catch {
                return 0;
            }
        }
        if (typeof value.seconds === 'number')
            return value.seconds * 1000;
    }
    return 0;
}
function timestampValue(row) {
    return row.timestamp || row.ts || row.createdAt;
}
function displayTimestamp(value) {
    const text = cleanText(value, 64);
    if (text)
        return text;
    const ms = millis(value);
    return ms > 0 ? new Date(ms).toISOString() : '';
}
function publicObject(value, depth = 0) {
    if (!isRecord(value))
        return null;
    if (depth > MAX_PUBLIC_OBJECT_DEPTH)
        return { _truncated: true };
    const out = {};
    let copied = 0;
    for (const [key, item] of Object.entries(value)) {
        if (SENSITIVE_KEY_RE.test(key))
            continue;
        if (copied >= MAX_PUBLIC_OBJECT_KEYS) {
            out._truncated = true;
            break;
        }
        const safeKey = cleanText(key, 60);
        if (!safeKey)
            continue;
        if (isRecord(item)) {
            const nested = publicObject(item, depth + 1);
            if (nested && Object.keys(nested).length) {
                out[safeKey] = nested;
                copied += 1;
            }
        }
        else if (Array.isArray(item)) {
            out[safeKey] = { count: item.length };
            copied += 1;
        }
        else if (typeof item === 'string') {
            out[safeKey] = cleanText(item, MAX_PUBLIC_STRING_LENGTH);
            copied += 1;
        }
        else if (typeof item === 'number') {
            if (Number.isFinite(item)) {
                out[safeKey] = item;
                copied += 1;
            }
        }
        else if (typeof item === 'boolean' || item === null) {
            out[safeKey] = item;
            copied += 1;
        }
    }
    return out;
}
function encodeTimestampCursor(row) {
    return Buffer.from(JSON.stringify({ id: row.id, timestampMs: row.timestampMs }), 'utf8').toString('base64url');
}
function decodeTimestampCursor(cursor) {
    const safeCursor = cleanText(cursor, 501);
    if (!safeCursor)
        return { id: '', timestampMs: 0 };
    if (!CURSOR_RE.test(safeCursor))
        throw new https_1.HttpsError('invalid-argument', 'cursor is invalid');
    try {
        const parsed = JSON.parse(Buffer.from(safeCursor, 'base64url').toString('utf8'));
        const id = cleanText(parsed.id, 160);
        if (!id)
            throw new Error('missing id');
        return { id, timestampMs: Number(parsed.timestampMs || 0) };
    }
    catch {
        throw new https_1.HttpsError('invalid-argument', 'cursor is invalid');
    }
}
function compareTimestampRows(a, b) {
    const timeDelta = Number(b.timestampMs || 0) - Number(a.timestampMs || 0);
    if (timeDelta !== 0)
        return timeDelta;
    return String(a.id || '').localeCompare(String(b.id || ''));
}
function rowIsAfterCursor(row, cursor) {
    if (!cursor?.id)
        return true;
    const rowMs = Number(row.timestampMs || 0);
    if (cursor.timestampMs > 0 && rowMs > 0) {
        if (rowMs < cursor.timestampMs)
            return true;
        if (rowMs === cursor.timestampMs)
            return String(row.id || '') > cursor.id;
        return false;
    }
    return String(row.id || '') > cursor.id;
}
function cursorBoundaryForField(field, timestampMs) {
    return field === 'createdAt' ? admin.firestore.Timestamp.fromMillis(timestampMs) : new Date(timestampMs).toISOString();
}
async function collectTimestampRows(collection, fields, scanLimit, cursorValue = '') {
    const cursor = cursorValue ? decodeTimestampCursor(cursorValue) : null;
    const collectionWithDoc = collection;
    const cursorDoc = cursor?.id && typeof collectionWithDoc.doc === 'function' ? await collectionWithDoc.doc(cursor.id).get() : null;
    if (cursor?.id && cursorDoc && !cursorDoc.exists)
        throw new https_1.HttpsError('failed-precondition', 'cursor document no longer exists');
    const cursorData = cursorDoc?.exists ? cursorDoc.data() : {};
    const rows = [];
    const health = [];
    await Promise.all(fields.map(async (field) => {
        try {
            let query = collection;
            const cursorHasField = Boolean(cursorDoc?.exists && isRecord(cursorData) && cursorData[field] !== undefined && cursorData[field] !== null);
            if (cursor?.id && !cursorHasField && cursor.timestampMs > 0)
                query = query.where(field, '<=', cursorBoundaryForField(field, cursor.timestampMs));
            query = query.orderBy(field, 'desc');
            if (cursorHasField && cursorDoc)
                query = query.startAfter(cursorDoc);
            const snapshot = await query.limit(scanLimit).get();
            rows.push(...snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
            health.push({ field, state: snapshot.size >= scanLimit ? 'truncated' : snapshot.size ? 'ready' : 'empty', count: snapshot.size, error: '' });
        }
        catch (error) {
            health.push({ field, state: 'error', count: 0, error: error instanceof Error ? error.message : String(error) });
        }
    }));
    return {
        rows,
        scanned: rows.length,
        saturated: health.some((source) => source.state === 'truncated'),
        health: fields.map((field) => health.find((source) => source.field === field) ?? { field, state: 'error', count: 0, error: 'missing_result' }),
    };
}
//# sourceMappingURL=admin_log_projection.js.map